/**
 * agent.run 公共字段：本机 CLI 带 runtimeId。ACP 不传 Fast / 思考档。
 */
import { runModeForComposer } from "../components/ai-chat/composer/composer-mode"
import { isAcpComposerRuntime } from "../lib/agent-runtime"
import { getEffectiveModel } from "../lib/session-model"
import type { ChatStore } from "../stores/chat-store"

export function codingAgentRunInput(store: ChatStore) {
  const acp = isAcpComposerRuntime(store.runtimeId)
  const modelId =
    getEffectiveModel({
      sessionId: store.sessionId,
      sessionModels: store.sessionModels,
      engineDefault: store.modelId,
      catalogFirst: store.models[0]?.id
    }) || (acp ? `cli:${store.runtimeId}` : "")
  return {
    sessionId: store.sessionId,
    workspaceId: store.workspaceId,
    modelId,
    mode: runModeForComposer(store.runtimeId, store.mode),
    reasoningEffort: acp ? undefined : store.reasoningEffort,
    fast: acp ? undefined : store.isFastMode,
    runtimeId: store.runtimeId
  }
}
