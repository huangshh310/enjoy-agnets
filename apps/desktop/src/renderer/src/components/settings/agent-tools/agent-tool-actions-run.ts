/**
 * 智能体卡片动作：安装 / 登录 / doctor / 同步，副作用集中在此。
 */
import type { QueryClient } from "@tanstack/react-query"
import type {
  AgentToolDoctorResult,
  AgentToolId,
  AgentToolPublic,
  InstallAgentToolResult,
  SyncCliConfigResult,
  UninstallAgentToolResult
} from "@enjoy-agents/ipc-contract"
import { completeCliEngineLogin, completeCliProviderLogin } from "@renderer/components/ai-chat/agent-picker/cli-login-action"
import { requestEngineSwitch } from "@renderer/components/ai-chat/agent-picker/handoff/engine-handoff-store"
import { getIde, hasIde } from "@renderer/lib/ide"
import { router } from "@renderer/router"

export type AgentToolBusy = "install" | "login" | "doctor" | "activate" | "uninstall" | null

export async function handleMakeActive(
  tool: AgentToolPublic,
  setBusy: (value: AgentToolBusy) => void,
  queryClient: QueryClient
) {
  setBusy("activate")
  try {
    const result = await requestEngineSwitch(tool.id, tool.selectedModel)
    if (result === "pending" || result === "blocked") {
      await router.navigate({ to: "/" })
    }
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  } finally {
    setBusy(null)
  }
}

export async function handleRunDoctor(
  tool: AgentToolPublic,
  setBusy: (value: AgentToolBusy) => void,
  setDoctor: (value: AgentToolDoctorResult | null) => void,
  queryClient: QueryClient
) {
  if (!hasIde()) return
  setBusy("doctor")
  try {
    const res = (await getIde().agentTools.doctor({ id: tool.id as AgentToolId })) as AgentToolDoctorResult
    setDoctor(res)
    await queryClient.invalidateQueries({ queryKey: ["agentTools.inspect"] })
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

export async function handleLogin(
  tool: AgentToolPublic,
  setBusy: (value: AgentToolBusy) => void,
  setFeedback: (value: string | null) => void,
  queryClient: QueryClient,
  provider?: string
) {
  if (!hasIde()) return
  setBusy("login")
  try {
    const res = provider
      ? await completeCliProviderLogin({
          toolId: tool.id as AgentToolId,
          providerId: provider
        })
      : await completeCliEngineLogin({ toolId: tool.id as AgentToolId })
    setFeedback(res.message)
    await getIde().agentTools.inspect({ id: tool.id as AgentToolId, refresh: true })
    await queryClient.invalidateQueries({ queryKey: ["agentTools.inspect"] })
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  } finally {
    setBusy(null)
  }
}

export async function handleInstall(
  tool: AgentToolPublic,
  setBusy: (value: AgentToolBusy) => void,
  setFeedback: (value: string | null) => void,
  queryClient: QueryClient,
  setInstallError: (value: string | null) => void
) {
  if (!hasIde() || tool.installKind === "copy") return
  setBusy("install")
  setFeedback(null)
  setInstallError(null)
  try {
    const res = (await getIde().agentTools.install({
      id: tool.id as AgentToolId
    })) as InstallAgentToolResult
    if (res.ok) {
      setInstallError(null)
      setFeedback(res.message)
      await queryClient.invalidateQueries({ queryKey: ["settings"] })
      return
    }
    setInstallError(res.message)
  } catch (err) {
    setInstallError(err instanceof Error ? err.message : String(err))
  } finally {
    setBusy(null)
  }
}

export async function handleUninstall(
  tool: AgentToolPublic,
  setBusy: (value: AgentToolBusy) => void,
  setFeedback: (value: string | null) => void,
  queryClient: QueryClient
) {
  if (!hasIde()) return
  setBusy("uninstall")
  try {
    const res = (await getIde().agentTools.uninstall({
      id: tool.id as AgentToolId
    })) as UninstallAgentToolResult
    setFeedback(res.message)
    if (res.ok) await queryClient.invalidateQueries({ queryKey: ["settings"] })
  } catch (err) {
    setFeedback(err instanceof Error ? err.message : String(err))
  } finally {
    setBusy(null)
  }
}

export async function handleSyncToCli(
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

export async function handleRestoreCli(
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

export function copyOnce(text: string, setCopied: (value: boolean) => void) {
  void navigator.clipboard.writeText(text).then(() => {
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  })
}
