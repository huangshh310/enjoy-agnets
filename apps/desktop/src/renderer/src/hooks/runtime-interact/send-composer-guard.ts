/**
 * 发送前置：Enjoy Local 共用 chatRouteGateCode；无快照放行。
 */
import { chatRouteGateCode } from "@enjoy-agents/ipc-contract/chat-readiness"
import { rememberedAgentTool } from "../agent-tools-cache.ts"
import { peekChatReadiness, peekCodingRuntime } from "../chat-readiness-cache.ts"
import { canBindEngine, engineReadiness } from "../../components/ai-chat/agent-picker/engine-readiness.ts"
import { readinessInputOf } from "../../components/ai-chat/agent-picker/engine-readiness-input.ts"
import { hasIde } from "../../lib/ide.ts"
import {
  NEED_CLI_AUTHORIZING,
  NEED_CLI_INSPECTING,
  NEED_CLI_LOGIN,
  NEED_CLI_LOGIN_FAILED,
  NEED_CLI_OUTDATED,
  NEED_MODEL,
  NEED_PROVIDER_KEY,
  NEED_REMOTE_CONNECTED,
  NO_CHAT_ROUTE
} from "../../lib/usage/classify-thread-error.ts"

type ComposerGuardStore = {
  runtimeId: string
  hasKey: boolean
  modelId: string
  workspaceId: string | null
  sessionId: string | null
  workspaceKind?: "local" | "ssh"
  remoteStatus?: "idle" | "connecting" | "connected" | "failed" | "disconnected" | null
  setError: (message: string | null) => void
  setAgentPickerOpen: (open: boolean) => void
}

function enjoyLocalGateCode(): typeof NO_CHAT_ROUTE | null {
  const snap = peekChatReadiness()
  return chatRouteGateCode({
    runtimeId: "enjoy-local",
    codingRuntime: peekCodingRuntime(),
    hasEnjoySecret: snap ? (snap.hasEnjoySecret ?? "unknown") : "unknown",
    verifiedLocal: snap ? snap.localModels.some((row) => row.verified === true) : "unknown"
  })
}

/** 当前档案有密钥才催选模型，不是「任意档案有密钥」。 */
function currentProfileNeedsModel(modelId: string): boolean {
  const snap = peekChatReadiness()
  if (!snap?.hasEnjoySecret || !snap.defaultRoute?.profileId) return false
  return !modelId.trim()
}

function enjoyLocalAllowsSend(): boolean {
  return enjoyLocalGateCode() === null
}

/** 发送盘是否亮成可发：Enjoy Local 信共享闸；CLI 仍看登录 / 检测。 */
export function composerSendReady(
  store: Pick<ComposerGuardStore, "runtimeId" | "hasKey" | "modelId" | "workspaceKind" | "remoteStatus">
): boolean {
  if ((store.workspaceKind ?? "local") === "ssh") {
    const status = store.remoteStatus ?? "disconnected"
    if (status !== "connected") return false
  }
  if (store.runtimeId === "enjoy-local") {
    if (!enjoyLocalAllowsSend()) return false
    if (currentProfileNeedsModel(store.modelId)) return false
    return true
  }
  const tool = rememberedAgentTool(store.runtimeId)
  if (!tool) return false
  const input = readinessInputOf(tool)
  return canBindEngine(input) && engineReadiness(input) === "ready"
}

export function guardComposerSend(
  store: ComposerGuardStore,
  opts?: { ideReady?: boolean }
): boolean {
  const ideReady = opts?.ideReady ?? hasIde()
  if (!ideReady) {
    store.setError("The desktop IPC bridge is not available.")
    return false
  }
  if (!store.workspaceId || !store.sessionId) {
    store.setError("Open a workspace folder before running an agent.")
    return false
  }
  if ((store.workspaceKind ?? "local") === "ssh") {
    const status = store.remoteStatus ?? "disconnected"
    if (status === "connecting" || status === "failed" || status === "disconnected" || status === "idle") {
      store.setError(NEED_REMOTE_CONNECTED)
      return false
    }
  }
  if (store.runtimeId === "enjoy-local") {
    if (enjoyLocalGateCode()) {
      store.setError(NO_CHAT_ROUTE)
      return false
    }
    if (currentProfileNeedsModel(store.modelId)) {
      store.setError(NEED_MODEL)
      return false
    }
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
  if (kind === "outdated") {
    store.setError(NEED_CLI_OUTDATED)
    return false
  }
  store.setError(NEED_CLI_LOGIN)
  store.setAgentPickerOpen(true)
  return false
}
