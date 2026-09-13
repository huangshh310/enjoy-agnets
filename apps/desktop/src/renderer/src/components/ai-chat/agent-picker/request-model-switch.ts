/**
 * 同引擎换模入口：只写会话覆盖，禁止进 handoff store。
 */
import type { AgentToolId } from "@enjoy-agents/ipc-contract"
import { persistSessionModel } from "@renderer/hooks/persist-runtime"
import { isAcpComposerRuntime } from "@renderer/lib/agent-runtime"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { sessionHasUserTurns } from "./handoff/plan-composer-switch"

export async function requestModelSwitch(modelId: string): Promise<"applied" | "noop"> {
  const next = modelId.trim()
  if (!next) return "noop"
  const chat = useChatStore.getState()
  await persistSessionModel(next)
  if (
    sessionHasUserTurns(chat.messages) &&
    isAcpComposerRuntime(chat.runtimeId) &&
    hasIde() &&
    chat.sessionId
  ) {
    await getIde().agentTools.disposeSession({ sessionId: chat.sessionId })
    useChatStore.getState().markModelSwitch(chat.sessionId)
  }
  return "applied"
}

export async function requestSameEngineModel(to: AgentToolId, modelId?: string): Promise<"applied" | "noop"> {
  if (to !== useChatStore.getState().runtimeId) return "noop"
  if (!modelId) return "noop"
  return requestModelSwitch(modelId)
}
