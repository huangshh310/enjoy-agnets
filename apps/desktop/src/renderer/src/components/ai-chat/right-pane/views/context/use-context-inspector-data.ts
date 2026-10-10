/**
 * Context 检查器数据：会话 store、芯片、MCP/规则/技能/遥测、压缩态。
 */
import { useSyncExternalStore } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  listSessionContextChips,
  subscribeSessionContextChips
} from "@renderer/hooks/session-context-chips"
import { inspectorContextModel } from "./inspector-context-model"
import { useEngineHandoffStore } from "@renderer/components/ai-chat/agent-picker/handoff/engine-handoff-store"
import { publishedContextWindow } from "@enjoy-agents/providers/context-window"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import {
  reportedTurnTokens,
  sessionUsageFor,
  sessionUsageVersion,
  subscribeSessionUsage
} from "@renderer/stores/session-usage"
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
import {
  estimateContextWindowStats,
  estimateTurnPerformance,
  overlayReportedUsage
} from "./context-token-estimator"
import { useSessionCompaction } from "./compact-session/use-session-compaction"

export function useContextInspectorData(workspaceId: string | null) {
  const slice = useInspectorChatSlice()
  const face = useInspectorFace(slice)
  const chips = useSyncExternalStore(
    subscribeSessionContextChips,
    listSessionContextChips,
    listSessionContextChips
  )
  const catalogs = useInspectorCatalogs(workspaceId)
  const customInstructions = useCustomInstructions()
  const { compaction } = useSessionCompaction(slice.sessionId)
  useSyncExternalStore(subscribeSessionUsage, sessionUsageVersion, sessionUsageVersion)
  const usage = sessionUsageFor(slice.sessionId)
  const contextWindow = resolveInspectorWindow(
    slice.models,
    face.id,
    usage?.contextWindow,
    usage?.contextRuntimeId,
    face.runtimeId
  )
  return inspectorSnapshot({
    slice,
    face,
    chips,
    catalogs,
    customInstructions,
    compaction,
    contextWindow,
    reportedTokens: reportedTurnTokens(usage)
  })
}

function inspectorSnapshot(input: {
  slice: ReturnType<typeof useInspectorChatSlice>
  face: ReturnType<typeof useInspectorFace>
  chips: ReturnType<typeof listSessionContextChips>
  catalogs: ReturnType<typeof useInspectorCatalogs>
  customInstructions: string
  compaction: ReturnType<typeof useSessionCompaction>["compaction"]
  contextWindow: number | undefined
  reportedTokens: number | null
}) {
  const { slice, face, chips, catalogs, customInstructions, compaction, contextWindow } = input
  const effectiveMessages = compaction
    ? (applySessionCompaction(slice.messages, compaction) as typeof slice.messages)
    : slice.messages
  const tokenStats = overlayReportedUsage(
    estimateContextWindowStats(
      effectiveMessages,
      contextWindow ?? 0,
      catalogs.mcp,
      catalogs.rules,
      catalogs.skills,
      chips,
      customInstructions,
      slice.runtimeId
    ),
    input.reportedTokens
  )
  return {
    sessionId: slice.sessionId,
    compaction,
    contextWindow,
    modelId: face.id,
    modelLabel: face.label,
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

function useInspectorFace(slice: ReturnType<typeof useInspectorChatSlice>) {
  const phase = useEngineHandoffStore((state) => state.phase)
  const toRuntimeId = useEngineHandoffStore((state) => state.toRuntimeId)
  const snapshot = useSettingsSnapshot()
  return inspectorContextModel({
    phase,
    toRuntimeId,
    runtimeId: slice.runtimeId,
    catalogId: slice.modelId,
    catalogLabel: slice.modelLabel,
    sessionModelId: slice.sessionId ? slice.sessionModels[slice.sessionId] : undefined,
    agents: snapshot.data?.agentTools ?? []
  })
}

/** 只信报出这次窗口的那台引擎。交接中看目标引擎，不用上一台留下的 size。 */
function resolveInspectorWindow(
  models: ReturnType<typeof useInspectorChatSlice>["models"],
  modelId: string,
  advertised: number | undefined,
  advertisedRuntime: string | undefined,
  faceRuntime: string
): number | undefined {
  if (advertised && advertised > 0 && advertisedRuntime === faceRuntime) return advertised
  return contextWindowForModel(models, modelId) ?? publishedContextWindow(modelId)
}

function useInspectorChatSlice() {
  return {
    modelId: useChatStore((state) => state.modelId),
    modelLabel: useChatStore((state) => state.modelLabel),
    sessionModels: useChatStore((state) => state.sessionModels),
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
