/**
 * 发送前置：无密钥 / 未登录先拦，不要跳设置或打出 ACP 英文堆栈。
 */
import { capabilitiesOf } from "@enjoy-agents/ipc-contract/runtime-capabilities"
import { rememberedAgentTool } from "../agent-tools-cache.ts"
import { canBindEngine, engineReadiness } from "../../components/ai-chat/agent-picker/engine-readiness.ts"
import { hasIde } from "../../lib/ide.ts"
import {
  NEED_CLI_INSPECTING,
  NEED_CLI_LOGIN,
  NEED_PROVIDER_KEY
} from "../../lib/usage/classify-thread-error.ts"

type ComposerGuardStore = {
  runtimeId: string
  hasKey: boolean
  workspaceId: string | null
  sessionId: string | null
  setError: (message: string | null) => void
  setAgentPickerOpen: (open: boolean) => void
}

export function guardComposerSend(store: ComposerGuardStore, opts?: { ideReady?: boolean }): boolean {
  const ideReady = opts?.ideReady ?? hasIde()
  if (!ideReady) {
    store.setError("The desktop IPC bridge is not available.")
    return false
  }
  if (!store.workspaceId || !store.sessionId) {
    store.setError("Open a workspace folder before running an agent.")
    return false
  }
  if (store.runtimeId === "enjoy-local") {
    if (store.hasKey) return true
    store.setError(NEED_PROVIDER_KEY)
    return false
  }
  const tool = rememberedAgentTool(store.runtimeId)
  const input = {
    id: store.runtimeId,
    status: tool?.status ?? "ready",
    comingSoon: tool?.comingSoon,
    requiresLogin: tool ? capabilitiesOf(tool).login : true,
    loggedIn: tool?.authAccount?.loggedIn ?? null
  }
  const kind = engineReadiness(input)
  if (canBindEngine(input) && kind === "ready") return true
  if (kind === "inspecting") {
    store.setError(NEED_CLI_INSPECTING)
    return false
  }
  store.setError(NEED_CLI_LOGIN)
  store.setAgentPickerOpen(true)
  return false
}
