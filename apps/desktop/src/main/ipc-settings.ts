/**
 * 设置 / 供应商 / models IPC。Automations 与探测在独立模块。
 */
import { ipcMain } from "electron"
import {
  ProviderIdInput,
  RemoveComposerPresetInput,
  SaveComposerPresetInput,
  SaveSecretInput,
  SetActiveModelInput,
  SetDefaultModelInput,
  SetHarnessInput,
  SetPreferencesInput,
  SetProviderEnabledInput,
  UpsertProviderInput,
  secretWriteBlocked
} from "@enjoy-agents/ipc-contract"
import { PROVIDER_PRESETS } from "@enjoy-agents/providers"
import { registerAutomationIpc } from "./ipc-automations"
import {
  asKind,
  detectStoredProvider,
  duplicateStoredProvider,
  pingStoredProvider,
  probeStoredProvider,
  setStoredProviderEnabled
} from "./ipc-provider-probe"
import { listComposerPresets, removeComposerPreset, saveComposerPreset } from "./services/composer-presets"
import { getSetting } from "./services/database"
import { parseRecentWorkspaceIds, RECENT_WORKSPACE_SETTING } from "./services/workspace-mru.ts"
import { harnessPublicStatus, writeHarnessSecret } from "./services/harness-secrets"
import { readKeybindingIssues, readPreferences, writePreferences } from "./services/preferences"
import { SecretWriteFailure } from "./services/secret-storage.ts"
import { runSecretWrite } from "./services/secret-write-guard.ts"
import { listAgentTools } from "./services/agent-tools-service"
import { scheduleChatReadinessPush } from "./services/chat-readiness"
import {
  markDefaultChatRouteExplicit,
  persistDefaultModelAfterSecret
} from "./services/default-chat-route"
import { readSessionModels, readSessionRuntimes } from "./services/agent-tools-vault"
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
  "settings.detectProvider",
  "settings.duplicateProvider",
  "settings.setProviderEnabled",
  "settings.presets",
  "settings.composerPresets",
  "settings.saveComposerPreset",
  "settings.removeComposerPreset",
  "automations.list",
  "automations.upsert",
  "automations.remove",
  "automations.run",
  "automations.missed.list",
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
    recentWorkspaceIds: parseRecentWorkspaceIds(getSetting(RECENT_WORKSPACE_SETTING)),
    providers: await listPublicProviders(),
    preferences: readPreferences(),
    keybindingIssues: readKeybindingIssues(),
    harness: await harnessPublicStatus(readPreferences().harnessId),
    agentTools: await listAgentTools(),
    sessionRuntimes: readSessionRuntimes(),
    sessionModels: readSessionModels()
  }
}

async function withSettingsSecretWrite(write: () => Promise<void>) {
  return runSecretWrite(async () => {
    await write()
    scheduleChatReadinessPush()
    return settingsSnapshot()
  })
}

function registerCoreSettingsIpc() {
  ipcMain.handle("settings.get", async () => settingsSnapshot())
  ipcMain.handle("settings.saveSecret", async (_event, raw) => {
    const input = SaveSecretInput.parse(raw)
    return withSettingsSecretWrite(async () => {
      await saveSecret({
        provider: asKind(input.provider),
        apiKey: input.apiKey,
        baseURL: input.baseURL,
        modelId: input.modelId
      })
    })
  })
  ipcMain.handle("settings.setDefaultModel", async (_event, raw) => {
    const modelId = SetDefaultModelInput.parse(raw).modelId
    return runSecretWrite(async () => {
      await persistDefaultModelAfterSecret(modelId, async () => {
        const active = await getActiveProfile()
        if (!active) return
        await upsertProfile({
          id: active.id,
          name: active.name,
          kind: active.kind,
          modelId,
          activate: true
        })
      })
      scheduleChatReadinessPush()
      return {}
    })
  })
  ipcMain.handle("settings.setPreferences", async (_event, raw) => {
    const input = SetPreferencesInput.parse(raw)
    const preferences = writePreferences(input)
    if (input.runtimeId) {
      markDefaultChatRouteExplicit()
      scheduleChatReadinessPush()
    }
    const { syncAppsnapHotkey } = await import("./services/appsnap/appsnap-hotkey")
    syncAppsnapHotkey({
      appsnapEnabled: preferences.appsnapEnabled,
      appsnapChord: preferences.appsnapChord,
      keybindings: preferences.keybindings
    })
    return { ok: true, preferences }
  })
  ipcMain.handle("settings.setHarness", async (_event, raw) => {
    return runSecretWrite(async () => {
      writeHarnessSecret(SetHarnessInput.parse(raw))
      scheduleChatReadinessPush()
      return { harness: await harnessPublicStatus(readPreferences().harnessId) }
    })
  })
  ipcMain.handle("settings.composerPresets", async () => listComposerPresets())
  ipcMain.handle("settings.saveComposerPreset", async (_event, raw) =>
    saveComposerPreset(SaveComposerPresetInput.parse(raw))
  )
  ipcMain.handle("settings.removeComposerPreset", async (_event, raw) =>
    removeComposerPreset(RemoveComposerPresetInput.parse(raw).id)
  )
}

function registerProviderIpc() {
  ipcMain.handle("settings.listProviders", async () => listPublicProviders())
  ipcMain.handle("settings.presets", async () => PROVIDER_PRESETS)
  ipcMain.handle("settings.upsertProvider", async (_event, raw) => {
    const input = UpsertProviderInput.parse(raw)
    return withSettingsSecretWrite(async () => {
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
        activate: input.activate,
        endpoints: input.endpoints,
        baseAPI: input.baseAPI,
        regionId: input.regionId,
        keys: input.keys,
        enabled: input.enabled,
        modelsURL: input.modelsURL,
        reasoningFamily: input.reasoningFamily,
        proxy: input.proxy
      })
    })
  })
  ipcMain.handle("settings.removeProvider", async (_event, raw) => {
    // 不走 runSecretWrite 预检：删完一张都不剩才整行清掉；还剩档案则 KEYCHAIN_UNAVAILABLE。
    try {
      await removeProfile(ProviderIdInput.parse(raw).id)
    } catch (error) {
      if (error instanceof SecretWriteFailure) return secretWriteBlocked(error.code)
      throw error
    }
    scheduleChatReadinessPush()
    return settingsSnapshot()
  })
  ipcMain.handle("settings.activateProvider", async (_event, raw) => {
    const id = ProviderIdInput.parse(raw).id
    const active = await getActiveProfile()
    if (active?.id === id) return settingsSnapshot()
    return withSettingsSecretWrite(async () => {
      await activateProfile(id)
    })
  })
  ipcMain.handle("settings.setActiveModel", async (_event, raw) => {
    return withSettingsSecretWrite(async () => {
      await setActiveModel(SetActiveModelInput.parse(raw))
    })
  })
  ipcMain.handle("settings.probeProvider", async (_event, raw) => probeStoredProvider(raw))
  ipcMain.handle("settings.pingProvider", async (_event, raw) => pingStoredProvider(raw))
  ipcMain.handle("settings.detectProvider", async (_event, raw) => detectStoredProvider(raw))
  ipcMain.handle("settings.duplicateProvider", async (_event, raw) => {
    return withSettingsSecretWrite(async () => {
      await duplicateStoredProvider(raw)
    })
  })
  ipcMain.handle("settings.setProviderEnabled", async (_event, raw) => {
    const input = SetProviderEnabledInput.parse(raw)
    const current = (await listPublicProviders()).find((row) => row.id === input.id)
    if (current && (current.enabled !== false) === input.enabled) return settingsSnapshot()
    return withSettingsSecretWrite(async () => {
      await setStoredProviderEnabled(raw)
    })
  })
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
