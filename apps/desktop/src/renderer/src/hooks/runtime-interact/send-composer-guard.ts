/**
 * 发送前置：无密钥 / 未登录先拦，不要跳设置或打出 ACP 英文堆栈。
 */
import { rememberedAgentTool } from "../agent-tools-cache.ts"
import { canBindEngine, engineReadiness } from "../../components/ai-chat/agent-picker/engine-readiness.ts"
import { readinessInputOf } from "../../components/ai-chat/agent-picker/engine-readiness-input.ts"
import { hasIde } from "../../lib/ide.ts"
import {
  NEED_CLI_AUTHORIZING,
  NEED_CLI_INSPECTING,
  NEED_CLI_LOGIN,
  NEED_CLI_LOGIN_FAILED,
  NEED_PROVIDER_KEY
} from "../../lib/usage/classify-thread-error.ts"

type ComposerGuardStore = {
  runtimeId: string
  hasKey: boolean
  modelId: string
  workspaceId: string | null
  sessionId: string | null
  setError: (message: string | null) => void
  setAgentPickerOpen: (open: boolean) => void
}

/** 发送盘是否亮成可发：与闸门同一套 ready。 */
export function composerSendReady(
  store: Pick<ComposerGuardStore, "runtimeId" | "hasKey" | "modelId">
): boolean {
  if (store.runtimeId === "enjoy-local") return Boolean(store.hasKey && store.modelId)
  const tool = rememberedAgentTool(store.runtimeId)
  if (!tool) return false
  const input = readinessInputOf(tool)
  return canBindEngine(input) && engineReadiness(input) === "ready"
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
    if (!store.hasKey) {
      store.setError(NEED_PROVIDER_KEY)
      return false
    }
    // 档案已亮、models.list 还没写进 store 时不要打 agent.run，否则主进程抛 Choose a model。
    if (!store.modelId) return false
    return true
  }
  const tool = rememberedAgentTool(store.runtimeId)
  if (!tool) {
    store.setError(NEED_CLI_INSPECTING)
    return false
  }
  const input = readinessInputOf(tool)
  const kind = engineReadiness(input)
  if (canBindEngine(input) && kind === "ready") return true
  if (kind === "needs_key") {
    store.setError(NEED_PROVIDER_KEY)
    return false
  }
  if (kind === "inspecting") {
    store.setError(NEED_CLI_INSPECTING)
    return false
  }
  if (kind === "authorizing") {
    store.setError(NEED_CLI_AUTHORIZING)
    return false
  }
  if (kind === "login_failed") {
    store.setError(NEED_CLI_LOGIN_FAILED)
    store.setAgentPickerOpen(true)
    return false
  }
  store.setError(NEED_CLI_LOGIN)
  store.setAgentPickerOpen(true)
  return false
}
