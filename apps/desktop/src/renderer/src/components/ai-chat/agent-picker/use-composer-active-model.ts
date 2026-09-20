/**
 * 当前引擎应对用户看见的模型名：审查条 / 检查器 / 胶囊共用。
 */
import { rememberedAgentTool } from "@renderer/hooks/agent-tools-cache"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useChatStore } from "@renderer/stores/chat-store"
import { composerActiveModelLabel } from "./composer-chip-label.ts"

export function useComposerActiveModelLabel(): string {
  const runtimeId = useChatStore((state) => state.runtimeId)
  const catalogLabel = useChatStore((state) => state.modelLabel)
  const catalogId = useChatStore((state) => state.modelId)
  const sessionId = useChatStore((state) => state.sessionId)
  const sessionModels = useChatStore((state) => state.sessionModels)
  const snapshot = useSettingsSnapshot()
  const agent =
    snapshot.data?.agentTools?.find((tool) => tool.id === runtimeId) ?? rememberedAgentTool(runtimeId)
  return composerActiveModelLabel({
    runtimeId,
    catalogLabel,
    catalogId,
    sessionModelId: sessionId ? sessionModels[sessionId] : undefined,
    agent
  })
}
