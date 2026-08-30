import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron"
import {
  ListDirInput,
  OpenWorkspaceInput,
  ReadFileInput,
  SaveSecretInput,
  SetPreferencesInput,
  PingProviderInput,
  ProbeProviderInput,
  UpsertProviderInput,
  UpsertAutomationInput,
  type Automation
} from "@enjoy-agents/ipc-contract"
import {
  PROVIDER_PRESETS,
  isApiStyle,
  pingProviderEndpoint,
  presetFor,
  probeProvider,
  type ProviderKind
} from "@enjoy-agents/providers"
import {
  abortAgent,
  createSession,
  decideApproval,
  listMessages,
  listSessions,
  runAgent
} from "./services/agent-runner"
import { getSetting, setSetting } from "./services/database"
import { createId } from "./services/ids"
import {
  activateProfile,
  getActiveProfile,
  hasSecret,
  listAllPublicModels,
  listPublicProviders,
  readSecret,
  readVault,
  removeProfile,
  saveSecret,
  setActiveModel,
  upsertProfile,
  writeVault
} from "./services/secrets"
import {
  changedFiles,
  getWorkspace,
  listWorkspaces,
  listWorkspaceDir,
  openWorkspace,
  readWorkspaceFile
} from "./services/workspace"

let ipcRegistered = false

const DEFAULT_PREFERENCES = {
  requireWriteApproval: true,
  requireBashApproval: true,
  language: "auto" as const,
  defaultMode: "agent" as const,
  customInstructions: ""
}

function readPreferences() {
  const raw = getSetting("preferences")
  if (!raw) return { ...DEFAULT_PREFERENCES }
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

function readAutomations(): Automation[] {
  const raw = getSetting("automations")
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Automation[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAutomations(automations: Automation[]): void {
  setSetting("automations", JSON.stringify(automations))
}

function asKind(value: string): ProviderKind {
  return value as ProviderKind
}

async function settingsSnapshot() {
  const secret = await readSecret()
  const active = await getActiveProfile()
  const ready = await hasSecret()
  return {
    hasKey: ready,
    provider: secret?.provider ?? null,
    baseURL: secret?.baseURL ?? null,
    defaultModelId: active?.modelId || getSetting("defaultModelId") || "deepseek-chat",
    lastWorkspaceId: getSetting("lastWorkspaceId") ?? null,
    providers: await listPublicProviders(),
    preferences: readPreferences()
  }
}

function windowFromEvent(event: IpcMainInvokeEvent): BrowserWindow {
  const fromSender = BrowserWindow.fromWebContents(event.sender)
  if (!fromSender || fromSender.isDestroyed()) {
    throw new Error("No UI window for this IPC call.")
  }
  return fromSender
}

const CHANNELS = [
  "workspace.open",
  "workspace.list",
  "workspace.files",
  "workspace.readFile",
  "workspace.changes",
  "session.list",
  "session.create",
  "session.messages",
  "agent.run",
  "agent.abort",
  "agent.decide",
  "settings.get",
  "settings.saveSecret",
  "settings.setDefaultModel",
  "settings.setPreferences",
  "settings.listProviders",
  "settings.upsertProvider",
  "settings.removeProvider",
  "settings.activateProvider",
  "settings.setActiveModel",
  "settings.probeProvider",
  "settings.pingProvider",
  "settings.presets",
  "automations.list",
  "automations.upsert",
  "automations.remove",
  "models.list"
] as const

export function registerIpc(_window: BrowserWindow) {
  if (ipcRegistered) return
  ipcRegistered = true

  ipcMain.handle("workspace.open", async (_event, raw) => {
    const input = OpenWorkspaceInput.parse(raw ?? {})
    const workspace = await openWorkspace(input.path)
    setSetting("lastWorkspaceId", workspace.id)
    return workspace
  })
  ipcMain.handle("workspace.list", async () => listWorkspaces())
  ipcMain.handle("workspace.files", async (_event, raw) => {
    const input = ListDirInput.parse(raw)
    return listWorkspaceDir(input.workspaceId, input.path)
  })
  ipcMain.handle("workspace.readFile", async (_event, raw) => {
    const input = ReadFileInput.parse(raw)
    return readWorkspaceFile(input.workspaceId, input.path)
  })
  ipcMain.handle("workspace.changes", async (_event, workspaceId: string) => {
    const workspace = await getWorkspace(workspaceId)
    return changedFiles(workspace.rootPath)
  })

  ipcMain.handle("session.list", async (_event, workspaceId: string) => listSessions(workspaceId))
  ipcMain.handle("session.create", async (_event, workspaceId: string, title?: string) =>
    createSession(workspaceId, title || "New agent")
  )
  ipcMain.handle("session.messages", async (_event, sessionId: string) => listMessages(sessionId))

  ipcMain.handle("agent.run", (event, raw) => runAgent(windowFromEvent(event), raw))
  ipcMain.handle("agent.abort", (_event, raw) => abortAgent(raw))
  ipcMain.handle("agent.decide", (event, raw) => decideApproval(windowFromEvent(event), raw))

  ipcMain.handle("settings.get", async () => {
    return settingsSnapshot()
  })
  ipcMain.handle("settings.saveSecret", async (_event, raw) => {
    const input = SaveSecretInput.parse(raw)
    await saveSecret({
      provider: asKind(input.provider),
      apiKey: input.apiKey,
      baseURL: input.baseURL,
      modelId: input.modelId
    })
    return settingsSnapshot()
  })
  ipcMain.handle("settings.setDefaultModel", async (_event, modelId: string) => {
    setSetting("defaultModelId", modelId)
    const active = await getActiveProfile()
    if (active) {
      await upsertProfile({
        id: active.id,
        name: active.name,
        kind: active.kind,
        modelId,
        activate: true
      })
    }
    return { ok: true }
  })
  ipcMain.handle("settings.setPreferences", async (_event, raw) => {
    const patch = SetPreferencesInput.parse(raw)
    const next = { ...readPreferences(), ...patch }
    setSetting("preferences", JSON.stringify(next))
    return { ok: true, preferences: next }
  })
  ipcMain.handle("settings.listProviders", async () => listPublicProviders())
  ipcMain.handle("settings.presets", async () => PROVIDER_PRESETS)
  ipcMain.handle("settings.upsertProvider", async (_event, raw) => {
    const input = UpsertProviderInput.parse(raw)
    await upsertProfile({
      id: input.id,
      name: input.name,
      kind: asKind(input.kind),
      apiKey: input.apiKey,
      baseURL: input.baseURL,
      modelId: input.modelId,
      apiStyle: input.apiStyle,
      fastModelId: input.fastModelId,
      reasoningModelId: input.reasoningModelId,
      contextWindow: input.contextWindow,
      maxTokens: input.maxTokens,
      temperature: input.temperature,
      reasoningEffort: input.reasoningEffort,
      customHeaders: input.customHeaders,
      customBody: input.customBody,
      models: input.models,
      activate: input.activate
    })
    return settingsSnapshot()
  })
  ipcMain.handle("settings.removeProvider", async (_event, id: string) => {
    await removeProfile(id)
    return settingsSnapshot()
  })
  ipcMain.handle("settings.activateProvider", async (_event, id: string) => {
    await activateProfile(id)
    return settingsSnapshot()
  })
  ipcMain.handle("settings.setActiveModel", async (_event, raw: { providerId?: string; modelId: string }) => {
    await setActiveModel(raw)
    return settingsSnapshot()
  })
  ipcMain.handle("settings.probeProvider", async (_event, raw) => {
    const input = ProbeProviderInput.parse(raw)
    const vault = await readVault()
    const stored = input.id ? vault.profiles.find((profile) => profile.id === input.id) : undefined
    const kind = asKind(input.kind)
    const apiKey = input.apiKey?.trim() ? input.apiKey.trim() : stored?.apiKey ?? ""
    const baseURL = input.baseURL ?? stored?.baseURL ?? presetFor(kind).defaultBaseURL
    const result = await probeProvider({
      provider: kind,
      apiKey,
      baseURL,
      modelId: input.modelId || stored?.modelId,
      apiStyle: isApiStyle(input.apiStyle)
        ? input.apiStyle
        : isApiStyle(stored?.apiStyle)
          ? stored.apiStyle
          : presetFor(kind).apiStyle
    })
    if (result.ok && result.models.length > 0 && stored) {
      stored.models = result.models
      if (result.resolvedBaseURL) stored.baseURL = result.resolvedBaseURL
      if (!result.models.some((m) => m.id === stored.modelId)) {
        stored.modelId = result.models[0].id
      }
      await writeVault(vault)
    }
    return result
  })
  ipcMain.handle("settings.pingProvider", async (_event, raw) => {
    const input = PingProviderInput.parse(raw)
    const vault = await readVault()
    const stored = input.id ? vault.profiles.find((profile) => profile.id === input.id) : undefined
    const kind = asKind(input.kind)
    const apiKey = input.apiKey?.trim() ? input.apiKey.trim() : stored?.apiKey ?? ""
    const baseURL = input.baseURL ?? stored?.baseURL ?? presetFor(kind).defaultBaseURL
    return pingProviderEndpoint({
      provider: kind,
      apiKey,
      baseURL,
      apiStyle: isApiStyle(input.apiStyle)
        ? input.apiStyle
        : isApiStyle(stored?.apiStyle)
          ? stored.apiStyle
          : presetFor(kind).apiStyle
    })
  })
  ipcMain.handle("automations.list", async () => readAutomations())
  ipcMain.handle("automations.upsert", async (_event, raw) => {
    const input = UpsertAutomationInput.parse(raw)
    const current = readAutomations()
    const id = input.id ?? createId("auto")
    const nextItem: Automation = {
      id,
      name: input.name,
      prompt: input.prompt,
      trigger: input.trigger,
      enabled: input.enabled,
      updatedAt: Date.now()
    }
    const next = current.some((item) => item.id === id)
      ? current.map((item) => (item.id === id ? nextItem : item))
      : [nextItem, ...current]
    writeAutomations(next)
    return nextItem
  })
  ipcMain.handle("automations.remove", async (_event, id: string) => {
    writeAutomations(readAutomations().filter((item) => item.id !== id))
    return { ok: true }
  })
  ipcMain.handle("models.list", async () => {
    return listAllPublicModels()
  })
}

export function unregisterIpc() {
  if (!ipcRegistered) return
  for (const channel of CHANNELS) ipcMain.removeHandler(channel)
  ipcRegistered = false
}
