/**
 * agent.run 公共字段：本机 CLI 带 runtimeId。ACP 不传 Fast / 思考档。
 */
import { isAcpComposerRuntime } from "../lib/agent-runtime"
import type { ChatStore } from "../stores/chat-store"

export function codingAgentRunInput(store: ChatStore) {
  const acp = isAcpComposerRuntime(store.runtimeId)
  return {
    sessionId: store.sessionId,
    workspaceId: store.workspaceId,
    modelId: store.modelId || (acp ? `cli:${store.runtimeId}` : ""),
    mode: store.mode,
    reasoningEffort: acp ? undefined : store.reasoningEffort,
    fast: acp ? undefined : store.isFastMode,
    runtimeId: store.runtimeId
  }
}
