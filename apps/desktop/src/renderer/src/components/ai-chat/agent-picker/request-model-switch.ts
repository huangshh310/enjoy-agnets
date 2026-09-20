/**
 * 同引擎换模入口：只写会话覆盖，禁止进 handoff store。
 */
import type { AgentToolId } from "@enjoy-agents/ipc-contract"
import { persistSessionModel } from "@renderer/hooks/persist-runtime"
import { isAcpComposerRuntime } from "@renderer/lib/agent-runtime"
import { getIde, hasIde } from "@renderer/lib/ide"
import { getEffectiveModel } from "@renderer/lib/session-model"
import { useChatStore } from "@renderer/stores/chat-store"
import { sessionHasUserTurns } from "./handoff/plan-composer-switch"

export async function requestModelSwitch(modelId: string): Promise<"applied" | "noop" | "failed"> {
  const next = modelId.trim()
  if (!next) return "noop"
  const chat = useChatStore.getState()
  const current = getEffectiveModel({
    sessionId: chat.sessionId,
    sessionModels: chat.sessionModels,
    engineDefault: chat.modelId
  })
  if (current === next) return "noop"
  try {
    await persistSessionModel(next)
    if (
      sessionHasUserTurns(chat.messages) &&
      isAcpComposerRuntime(chat.runtimeId) &&
      hasIde() &&
      chat.sessionId
    ) {
      try {
        await getIde().agentTools.disposeSession({ sessionId: chat.sessionId })
        useChatStore.getState().markModelSwitch(chat.sessionId)
      } catch {
        // 覆盖已写入；下一轮 session/prompt 仍用新模型。Enjoy session id 不变。
      }
    }
    return "applied"
  } catch {
    return "failed"
  }
}

export async function requestSameEngineModel(to: AgentToolId, modelId?: string): Promise<"applied" | "noop"> {
  if (to !== useChatStore.getState().runtimeId) return "noop"
  if (!modelId) return "noop"
  return requestModelSwitch(modelId)
}
