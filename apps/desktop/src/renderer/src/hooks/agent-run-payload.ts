/**
 * agent.run 公共字段：本机 CLI 带 runtimeId。ACP 不传 Fast；思考档走 thoughtLevel。
 */
import { sessionOverlayOnEngine } from "@enjoy-agents/ipc-contract/session-overlay"
import { runModeForComposer } from "../components/ai-chat/composer/composer-mode"
import { rememberedAgentTool } from "./agent-tools-cache"
import { isAcpComposerRuntime } from "../lib/agent-runtime"
import { getEffectiveModel } from "../lib/session-model"
import type { ChatStore } from "../stores/chat-store"

export function codingAgentRunInput(store: ChatStore) {
  const acp = isAcpComposerRuntime(store.runtimeId)
  const modelId = acp ? acpRunModelId(store) : enjoyRunModelId(store)
  return {
    sessionId: store.sessionId,
    workspaceId: store.workspaceId,
    modelId,
    mode: runModeForComposer(store.runtimeId, store.mode),
    reasoningEffort: acp ? undefined : store.reasoningEffort,
    thoughtLevel: acp ? store.acpThoughtLevel : undefined,
    fast: acp ? undefined : store.isFastMode,
    runtimeId: store.runtimeId
  }
}

function enjoyRunModelId(store: ChatStore): string {
  return (
    getEffectiveModel({
      sessionId: store.sessionId,
      sessionModels: store.sessionModels,
      engineDefault: store.modelId,
      catalogFirst: store.models[0]?.id
    }) || ""
  )
}

function acpRunModelId(store: ChatStore): string {
  const agent = rememberedAgentTool(store.runtimeId)
  const overlay = sessionOverlayOnEngine({
    runtimeId: store.runtimeId,
    sessionModelId: store.sessionId ? store.sessionModels[store.sessionId] : undefined,
    modelIds: agent ? agent.models?.map((item) => item.id) ?? [] : undefined
  })
  return overlay || agent?.selectedModel?.trim() || `cli:${store.runtimeId}`
}
