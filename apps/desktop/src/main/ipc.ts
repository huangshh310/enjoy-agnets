import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron"
import {
  ListDirInput,
  OpenWorkspaceInput,
  ReadFileInput,
  SaveSecretInput,
  SetPreferencesInput,
  UpsertAutomationInput,
  type Automation
} from "@enjoy-agents/ipc-contract"
import { MODEL_CATALOG } from "@enjoy-agents/providers"
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
import { hasSecret, readSecret, saveSecret } from "./services/secrets"
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
    const secret = await readSecret()
    return {
      hasKey: Boolean(secret),
      provider: secret?.provider ?? null,
      baseURL: secret?.baseURL ?? null,
      defaultModelId: getSetting("defaultModelId") ?? "deepseek-chat",
      lastWorkspaceId: getSetting("lastWorkspaceId") ?? null,
      preferences: readPreferences()
    }
  })
  ipcMain.handle("settings.saveSecret", async (_event, raw) => {
    const input = SaveSecretInput.parse(raw)
    await saveSecret(input)
    return { ok: true, hasKey: await hasSecret() }
  })
  ipcMain.handle("settings.setDefaultModel", async (_event, modelId: string) => {
    setSetting("defaultModelId", modelId)
    return { ok: true }
  })
  ipcMain.handle("settings.setPreferences", async (_event, raw) => {
    const patch = SetPreferencesInput.parse(raw)
    const next = { ...readPreferences(), ...patch }
    setSetting("preferences", JSON.stringify(next))
    return { ok: true, preferences: next }
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
  ipcMain.handle("models.list", async () => MODEL_CATALOG)
}

export function unregisterIpc() {
  if (!ipcRegistered) return
  for (const channel of CHANNELS) ipcMain.removeHandler(channel)
  ipcRegistered = false
}
