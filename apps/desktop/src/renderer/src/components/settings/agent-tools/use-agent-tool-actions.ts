/**
 * 智能体卡片的安装 / 登录 / 同步 / 持久化动作。
 */
import { useState } from "react"
import {
  capabilitiesOf,
  providersSelectableFor,
  type AgentToolId,
  type AgentToolPublic
} from "@enjoy-agents/ipc-contract"
import { useQueryClient } from "@tanstack/react-query"
import { getIde, hasIde } from "@renderer/lib/ide"
import { DEFAULT_RUNTIME_ID } from "@renderer/lib/agent-runtime"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"
import {
  copyOnce,
  handleInstall,
  handleLogin,
  handleMakeActive,
  handleRestoreCli,
  handleRunDoctor,
  handleSyncToCli,
  handleUninstall,
  type AgentToolBusy
} from "./agent-tool-actions-run"
import { getAgentBrandMeta } from "./agent-tool-constants"
import { useDrawerDoctor } from "./drawer-trust/use-drawer-doctor"
import { mapBindError, unwrapIpcError } from "./map-agent-tool-error"

export type { AgentToolBusy }

export function useAgentToolActions(tool: AgentToolPublic) {
  const t = useT()
  const queryClient = useQueryClient()
  const snapshot = useSettingsSnapshot().data
  const activeRuntimeId = snapshot?.preferences.runtimeId ?? DEFAULT_RUNTIME_ID
  const providers = snapshot?.providers ?? []
  const [path, setPath] = useState(tool.binaryPath ?? "")
  const [copiedPath, setCopiedPath] = useState(false)
  const [copiedCommand, setCopiedCommand] = useState(false)
  const [syncingConfig, setSyncingConfig] = useState(false)
  const [restoringConfig, setRestoringConfig] = useState(false)
  const [busyAction, setBusyAction] = useState<AgentToolBusy>(null)
  const { doctorResult, doctorRanAt, rememberDoctor } = useDrawerDoctor(tool.id)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [installError, setInstallError] = useState<string | null>(null)
  const [loginProvider, setLoginProvider] = useState<string | null>(null)

  async function persist(patch: {
    enabled?: boolean
    binaryPath?: string
    extraArgs?: string[]
    modelId?: string
    providerId?: string
    useCustomProvider?: boolean
  }) {
    if (!hasIde()) return
    try {
      await getIde().agentTools.upsert({
        id: tool.id as AgentToolId,
        useCustomProvider: tool.useCustomProvider,
        providerId: tool.providerId,
        ...patch
      })
      await queryClient.invalidateQueries({ queryKey: ["settings"] })
      setFeedbackMessage(null)
    } catch (err) {
      setFeedbackMessage(mapBindError(unwrapIpcError(err), t))
    }
  }

  return {
    meta: getAgentBrandMeta(tool.id),
    isActive: tool.id === activeRuntimeId,
    isDefaultLocal: tool.id === DEFAULT_RUNTIME_ID,
    configurable: tool.available && !tool.skillOnly && tool.id !== DEFAULT_RUNTIME_ID,
    supportsCustomInjection: capabilitiesOf(tool).providerBind !== "none",
    compatibleProviders: providersSelectableFor(tool.id, providers),
    allProviders: providers,
    path,
    setPath,
    copiedPath,
    copiedCommand,
    syncingConfig,
    restoringConfig,
    busyAction,
    doctorResult,
    doctorRanAt,
    setDoctorResult: rememberDoctor,
    feedbackMessage,
    installError,
    loginProvider,
    persist,
    persistRuntime: () => handleMakeActive(tool, setBusyAction, queryClient),
    runDoctor: () => handleRunDoctor(tool, setBusyAction, rememberDoctor, queryClient),
    runLogin: async (provider?: string) => {
      setLoginProvider(provider ?? null)
      try {
        await handleLogin(tool, setBusyAction, setFeedbackMessage, queryClient, provider)
      } finally {
        setLoginProvider(null)
      }
    },
    runInstall: () => handleInstall(tool, setBusyAction, setFeedbackMessage, queryClient, setInstallError),
    runUninstall: () => handleUninstall(tool, setBusyAction, setFeedbackMessage, queryClient),
    syncToCli: () => handleSyncToCli(tool, setSyncingConfig, setFeedbackMessage),
    restoreCli: () => handleRestoreCli(tool, setRestoringConfig, setFeedbackMessage),
    copyPath: (text: string) => copyOnce(text, setCopiedPath),
    copyInstallCmd: (text: string) => copyOnce(text, setCopiedCommand)
  }
}

export type AgentToolActions = ReturnType<typeof useAgentToolActions>
