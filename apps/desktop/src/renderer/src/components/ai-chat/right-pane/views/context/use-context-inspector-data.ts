/**
 * Context 检查器数据：会话 store、芯片、MCP/规则/技能/遥测。
 */
import { useSyncExternalStore } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  listSessionContextChips,
  subscribeSessionContextChips
} from "@renderer/hooks/session-context-chips"
import { useChatStore } from "@renderer/stores/chat-store"
import { getIde, hasIde } from "@renderer/lib/ide"
import type { McpServer, ProjectRuleItem, SkillItem, TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { citedSourcesFromMessages, toolsFromMessages } from "./thread-run-slice"
import { estimateContextWindowStats, estimateTurnPerformance } from "./context-token-estimator"

export function useContextInspectorData(workspaceId: string | null) {
  const modelId = useChatStore((state) => state.modelId)
  const modelLabel = useChatStore((state) => state.modelLabel)
  const mode = useChatStore((state) => state.mode)
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const workspaceName = useChatStore((state) => state.workspaceName)
  const changes = useChatStore((state) => state.changes)
  const sessionId = useChatStore((state) => state.sessionId)
  const chips = useSyncExternalStore(
    subscribeSessionContextChips,
    listSessionContextChips,
    listSessionContextChips
  )
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
  const tokenStats = estimateContextWindowStats(
    messages,
    modelId,
    mcpQuery.data ?? [],
    rulesQuery.data ?? [],
    skillsQuery.data ?? [],
    chips
  )
  return {
    sessionId,
    modelId,
    modelLabel,
    mode,
    messages,
    running,
    workspaceName,
    changesCount: changes.length,
    chips,
    tokenStats,
    turnPerf: estimateTurnPerformance(metricsQuery.data?.[0] ?? null, messages, running),
    sources: citedSourcesFromMessages(messages),
    turnTools: toolsFromMessages(messages),
    mcpServers: mcpQuery.data ?? []
  }
}

function useIdeQuery<T>(queryKey: unknown[], queryFn: () => Promise<T>, extraEnabled = true) {
  return useQuery({
    queryKey,
    enabled: hasIde() && extraEnabled,
    queryFn
  })
}
