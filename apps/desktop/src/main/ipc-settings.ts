/**
 * 设置 / 供应商 / models IPC。Automations 与探测在独立模块。
 */
import { ipcMain } from "electron"
import {
  ProviderIdInput,
  SaveSecretInput,
  SetActiveModelInput,
  SetDefaultModelInput,
  SetHarnessInput,
  SetPreferencesInput,
  UpsertProviderInput
} from "@enjoy-agents/ipc-contract"
import { PROVIDER_PRESETS } from "@enjoy-agents/providers"
import { registerAutomationIpc } from "./ipc-automations"
import { asKind, pingStoredProvider, probeStoredProvider } from "./ipc-provider-probe"
import { getSetting, setSetting } from "./services/database"
import { harnessPublicStatus, writeHarnessSecret } from "./services/harness-secrets"
import { readPreferences, writePreferences } from "./services/preferences"
import { listAgentTools } from "./services/agent-tools-service"
import { readSessionRuntimes } from "./services/agent-tools-vault"
import {
  activateProfile,
  getActiveProfile,
  hasSecret,
  listAllPublicModels,
  listPublicProviders,
  readSecret,
  removeProfile,
  saveSecret,
  setActiveModel,
  upsertProfile
} from "./services/secrets"

export const SETTINGS_CHANNELS = [
  "settings.get",
  "settings.saveSecret",
  "settings.setDefaultModel",
  "settings.setPreferences",
  "settings.setHarness",
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
  "automations.run",
  "models.list"
] as const

export function registerSettingsIpc() {
  registerCoreSettingsIpc()
  registerProviderIpc()
  registerAutomationIpc()
  registerModelsIpc()
}

async function settingsSnapshot() {
  const secret = await readSecret()
  const active = await getActiveProfile()
  const ready = await hasSecret()
  return {
    hasKey: ready,
    provider: secret?.provider ?? null,
    baseURL: secret?.baseURL ?? null,
    defaultModelId: active?.modelId || getSetting("defaultModelId") || "",
    lastWorkspaceId: getSetting("lastWorkspaceId") ?? null,
    providers: await listPublicProviders(),
    preferences: readPreferences(),
    harness: await harnessPublicStatus(readPreferences().harnessId),
    agentTools: await listAgentTools(),
    sessionRuntimes: readSessionRuntimes()
  }
}

function registerCoreSettingsIpc() {
  ipcMain.handle("settings.get", async () => settingsSnapshot())
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
  ipcMain.handle("settings.setDefaultModel", async (_event, raw) => {
    const modelId = SetDefaultModelInput.parse(raw).modelId
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
    return { ok: true, preferences: writePreferences(SetPreferencesInput.parse(raw)) }
  })
  ipcMain.handle("settings.setHarness", async (_event, raw) => {
    writeHarnessSecret(SetHarnessInput.parse(raw))
    return { ok: true, harness: await harnessPublicStatus(readPreferences().harnessId) }
  })
}

function registerProviderIpc() {
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
  ipcMain.handle("settings.removeProvider", async (_event, raw) => {
    await removeProfile(ProviderIdInput.parse(raw).id)
    return settingsSnapshot()
  })
  ipcMain.handle("settings.activateProvider", async (_event, raw) => {
    await activateProfile(ProviderIdInput.parse(raw).id)
    return settingsSnapshot()
  })
  ipcMain.handle("settings.setActiveModel", async (_event, raw) => {
    await setActiveModel(SetActiveModelInput.parse(raw))
    return settingsSnapshot()
  })
  ipcMain.handle("settings.probeProvider", async (_event, raw) => probeStoredProvider(raw))
  ipcMain.handle("settings.pingProvider", async (_event, raw) => pingStoredProvider(raw))
}

function registerModelsIpc() {
  ipcMain.handle("models.list", async () => {
    const { effectiveCapabilities, probedCapabilitiesFor } = await import("@enjoy-agents/providers")
    const models = await listAllPublicModels()
    return models.map((model) => {
      const probed = probedCapabilitiesFor(model.id, model.provider)
      return {
        ...model,
        capabilities: effectiveCapabilities(model.id, model.provider),
        staticCaps: probed.staticCaps,
        probedCaps: probed.probedCaps,
        probedAt: probed.probedAt
      }
    })
  })
}
