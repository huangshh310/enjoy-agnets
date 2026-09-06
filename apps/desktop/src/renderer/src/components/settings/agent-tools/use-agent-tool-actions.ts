/**
 * 智能体卡片的安装 / 登录 / 同步 / 持久化动作。
 */
import { useState } from "react"
import type {
  AgentToolDoctorResult,
  AgentToolId,
  AgentToolPublic,
  InstallAgentToolResult,
  SyncCliConfigResult
} from "@enjoy-agents/ipc-contract"
import { useQueryClient } from "@tanstack/react-query"
import { getIde, hasIde } from "@renderer/lib/ide"
import { DEFAULT_RUNTIME_ID } from "@renderer/lib/agent-runtime"
import { persistRuntimeId } from "@renderer/hooks/persist-runtime"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { getAgentBrandMeta } from "./agent-tool-constants"

export type AgentToolBusy = "install" | "login" | "doctor" | "activate" | null

export function useAgentToolActions(tool: AgentToolPublic) {
  const queryClient = useQueryClient()
  const snapshot = useSettingsSnapshot().data
  const activeRuntimeId = snapshot?.preferences.runtimeId ?? DEFAULT_RUNTIME_ID
  const providers = snapshot?.providers ?? []
  const [path, setPath] = useState(tool.binaryPath ?? "")
  const [args, setArgs] = useState((tool.extraArgs ?? []).join(" "))
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [copiedPath, setCopiedPath] = useState(false)
  const [copiedCommand, setCopiedCommand] = useState(false)
  const [syncingConfig, setSyncingConfig] = useState(false)
  const [restoringConfig, setRestoringConfig] = useState(false)
  const [busyAction, setBusyAction] = useState<AgentToolBusy>(null)
  const [doctorResult, setDoctorResult] = useState<AgentToolDoctorResult | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

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
      await getIde().agentTools.upsert({ id: tool.id as AgentToolId, ...patch })
      await queryClient.invalidateQueries({ queryKey: ["settings"] })
    } catch (err) {
      setFeedbackMessage(err instanceof Error ? err.message : String(err))
    }
  }

  return {
    meta: getAgentBrandMeta(tool.id),
    isActive: tool.id === activeRuntimeId,
    isDefaultLocal: tool.id === DEFAULT_RUNTIME_ID,
    configurable: tool.available && !tool.skillOnly && tool.id !== DEFAULT_RUNTIME_ID,
    supportsCustomInjection: tool.id === "claude" || tool.id === "codex",
    compatibleProviders: filterCompatibleProviders(tool.id, providers),
    path,
    setPath,
    args,
    setArgs,
    showAdvanced,
    setShowAdvanced,
    copiedPath,
    copiedCommand,
    syncingConfig,
    restoringConfig,
    busyAction,
    doctorResult,
    setDoctorResult,
    feedbackMessage,
    persist,
    persistRuntime: () => handleMakeActive(tool, setBusyAction, queryClient),
    runDoctor: () => handleRunDoctor(tool, setBusyAction, setDoctorResult),
    runLogin: () => handleLogin(tool, setBusyAction, setFeedbackMessage),
    runInstall: () => handleInstall(tool, setBusyAction, setFeedbackMessage, queryClient),
    syncToCli: () => handleSyncToCli(tool, setSyncingConfig, setFeedbackMessage),
    restoreCli: () => handleRestoreCli(tool, setRestoringConfig, setFeedbackMessage),
    copyPath: (text: string) => copyOnce(text, setCopiedPath),
    copyInstallCmd: (text: string) => copyOnce(text, setCopiedCommand)
  }
}

export type AgentToolActions = ReturnType<typeof useAgentToolActions>

function filterCompatibleProviders(
  toolId: string,
  providers: Array<{ id: string; name: string; baseURL?: string; apiStyle?: string; kind?: string }>
) {
  return providers.filter((item) => {
    if (toolId === "claude") {
      return item.apiStyle === "anthropic" || item.kind === "anthropic" || item.kind === "custom"
    }
    if (toolId === "codex") {
      return (
        item.apiStyle === "openai" ||
        item.apiStyle === "openai-responses" ||
        item.kind === "openai" ||
        item.kind === "custom"
      )
    }
    return true
  })
}

async function handleMakeActive(
  tool: AgentToolPublic,
  setBusy: (value: AgentToolBusy) => void,
  queryClient: ReturnType<typeof useQueryClient>
) {
  setBusy("activate")
  try {
    await persistRuntimeId(tool.id, tool.selectedModel)
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  } finally {
    setBusy(null)
  }
}

async function handleRunDoctor(
  tool: AgentToolPublic,
  setBusy: (value: AgentToolBusy) => void,
  setDoctor: (value: AgentToolDoctorResult | null) => void
) {
  if (!hasIde()) return
  setBusy("doctor")
  setDoctor(null)
  try {
    const res = (await getIde().agentTools.doctor({ id: tool.id as AgentToolId })) as AgentToolDoctorResult
    setDoctor(res)
  } catch (err) {
    setDoctor({
      id: tool.id as AgentToolId,
      ok: false,
      message: err instanceof Error ? err.message : "Doctor failed",
      version: null,
      path: null
    })
  } finally {
    setBusy(null)
  }
}

async function handleLogin(
  tool: AgentToolPublic,
  setBusy: (value: AgentToolBusy) => void,
  setFeedback: (value: string | null) => void
) {
  if (!hasIde()) return
  setBusy("login")
  try {
    const res = (await getIde().agentTools.login({ id: tool.id as AgentToolId })) as {
      ok: boolean
      message: string
    }
    setFeedback(res.message)
  } finally {
    setBusy(null)
  }
}

async function handleInstall(
  tool: AgentToolPublic,
  setBusy: (value: AgentToolBusy) => void,
  setFeedback: (value: string | null) => void,
  queryClient: ReturnType<typeof useQueryClient>
) {
  if (!hasIde() || tool.installKind === "copy") return
  setBusy("install")
  setFeedback(null)
  try {
    const res = (await getIde().agentTools.install({
      id: tool.id as AgentToolId
    })) as InstallAgentToolResult
    setFeedback(res.message)
    if (res.ok) await queryClient.invalidateQueries({ queryKey: ["settings"] })
  } finally {
    setBusy(null)
  }
}

async function handleSyncToCli(
  tool: AgentToolPublic,
  setSyncing: (value: boolean) => void,
  setFeedback: (value: string | null) => void
) {
  if (!hasIde()) return
  setSyncing(true)
  try {
    const res = (await getIde().agentTools.syncConfig({
      id: tool.id as AgentToolId
    })) as SyncCliConfigResult
    setFeedback(res.message)
  } catch (err) {
    setFeedback(err instanceof Error ? err.message : String(err))
  } finally {
    setSyncing(false)
  }
}

async function handleRestoreCli(
  tool: AgentToolPublic,
  setRestoring: (value: boolean) => void,
  setFeedback: (value: string | null) => void
) {
  if (!hasIde()) return
  setRestoring(true)
  try {
    const res = (await getIde().agentTools.restoreConfig({
      id: tool.id as AgentToolId
    })) as SyncCliConfigResult
    setFeedback(res.message)
  } catch (err) {
    setFeedback(err instanceof Error ? err.message : String(err))
  } finally {
    setRestoring(false)
  }
}

function copyOnce(text: string, setCopied: (value: boolean) => void) {
  void navigator.clipboard.writeText(text).then(() => {
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  })
}
