/**
 * Context 检查器数据：会话 store、芯片、MCP/规则/技能/遥测、压缩态。
 */
import { useSyncExternalStore } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  listSessionContextChips,
  subscribeSessionContextChips
} from "@renderer/hooks/session-context-chips"
import { useComposerActiveModelLabel } from "@renderer/components/ai-chat/agent-picker/use-composer-active-model"
import { useChatStore } from "@renderer/stores/chat-store"
import { getIde, hasIde } from "@renderer/lib/ide"
import type {
  McpServer,
  ProjectRuleItem,
  SettingsSnapshot,
  SkillItem,
  TelemetryMetric
} from "@enjoy-agents/ipc-contract"
import { applySessionCompaction } from "@enjoy-agents/agent-core/compaction"
import { citedSourcesFromMessages, toolsFromMessages } from "./thread-run-slice"
import { contextWindowForModel } from "@renderer/lib/model-context-window"
import { estimateContextWindowStats, estimateTurnPerformance } from "./context-token-estimator"
import { useSessionCompaction } from "./compact-session/use-session-compaction"

export function useContextInspectorData(workspaceId: string | null) {
  const slice = useInspectorChatSlice()
  const activeModelLabel = useComposerActiveModelLabel()
  const chips = useSyncExternalStore(
    subscribeSessionContextChips,
    listSessionContextChips,
    listSessionContextChips
  )
  const catalogs = useInspectorCatalogs(workspaceId)
  const customInstructions = useCustomInstructions()
  const { compaction } = useSessionCompaction(slice.sessionId)
  const contextWindow = contextWindowForModel(slice.models, slice.modelId)
  const effectiveMessages = compaction
    ? (applySessionCompaction(slice.messages, compaction) as typeof slice.messages)
    : slice.messages
  const tokenStats = estimateContextWindowStats(
    effectiveMessages,
    contextWindow ?? 0,
    catalogs.mcp,
    catalogs.rules,
    catalogs.skills,
    chips,
    customInstructions,
    slice.runtimeId
  )

  return {
    sessionId: slice.sessionId,
    compaction,
    contextWindow,
    modelId: slice.modelId,
    modelLabel: activeModelLabel,
    mode: slice.mode,
    messages: slice.messages,
    running: slice.running,
    workspaceName: slice.workspaceName,
    changesCount: slice.changes.length,
    chips,
    tokenStats,
    turnPerf: estimateTurnPerformance(catalogs.metric, slice.messages, slice.running),
    sources: citedSourcesFromMessages(slice.messages),
    turnTools: toolsFromMessages(slice.messages),
    mcpServers: catalogs.mcp
  }
}

function useInspectorChatSlice() {
  return {
    modelId: useChatStore((state) => state.modelId),
    models: useChatStore((state) => state.models),
    mode: useChatStore((state) => state.mode),
    messages: useChatStore((state) => state.messages),
    running: useChatStore((state) => state.running),
    workspaceName: useChatStore((state) => state.workspaceName),
    changes: useChatStore((state) => state.changes),
    sessionId: useChatStore((state) => state.sessionId),
    runtimeId: useChatStore((state) => state.runtimeId)
  }
}

function useInspectorCatalogs(workspaceId: string | null) {
  const mcpQuery = useIdeQuery(["mcp-servers-context"], () => getIde().mcp.servers() as Promise<McpServer[]>)
  const rulesQuery = useIdeQuery(
    ["workspace-rules-context", workspaceId],
    () => getIde().rules.list() as Promise<ProjectRuleItem[]>,
    Boolean(workspaceId)
  )
  const skillsQuery = useIdeQuery(
    ["workspace-skills-context", workspaceId],
    () => getIde().skills.list() as Promise<SkillItem[]>,
    Boolean(workspaceId)
  )
  const metricsQuery = useIdeQuery(
    ["latest-turn-metric"],
    () => getIde().observability.metrics({ limit: 1 }) as Promise<TelemetryMetric[]>
  )
  return {
    mcp: mcpQuery.data ?? [],
    rules: rulesQuery.data ?? [],
    skills: skillsQuery.data ?? [],
    metric: metricsQuery.data?.[0] ?? null
  }
}

function useCustomInstructions(): string {
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    enabled: hasIde(),
    queryFn: () => getIde().settings.get() as Promise<SettingsSnapshot>
  })
  return settingsQuery.data?.preferences.customInstructions ?? ""
}

function useIdeQuery<T>(queryKey: unknown[], queryFn: () => Promise<T>, extraEnabled = true) {
  return useQuery({
    queryKey,
    enabled: hasIde() && extraEnabled,
    queryFn
  })
}
