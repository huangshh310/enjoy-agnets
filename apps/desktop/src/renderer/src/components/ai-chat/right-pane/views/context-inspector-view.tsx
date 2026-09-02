/**
 * 上下文检查器：仪表盘与原始载荷双模式，数据来自会话 / MCP / 规则 / 遥测。
 */
import { useState, useSyncExternalStore } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  listSessionContextChips,
  subscribeSessionContextChips
} from "@renderer/hooks/session-context-chips"
import { useChatStore } from "@renderer/stores/chat-store"
import { getIde, hasIde } from "@renderer/lib/ide"
import type { CitedSource, McpServer, ProjectRuleItem, SkillItem, TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { citedSourcesFromMessages, toolsFromMessages } from "./context/thread-run-slice"
import { estimateContextWindowStats, estimateTurnPerformance } from "./context/context-token-estimator"
import { InspectorTokenSpectrum } from "./context/inspector-token-spectrum"
import { InspectorTurnWatermark } from "./context/inspector-turn-watermark"
import { InspectorGroundingCard } from "./context/inspector-grounding-card"
import { InspectorToolsMatrix } from "./context/inspector-tools-matrix"
import { InspectorRuntimeBar } from "./context/inspector-runtime-bar"
import { InspectorChunkDrawer } from "./context/inspector-chunk-drawer"
import { InspectorRawPrompt } from "./context/inspector-raw-prompt"
import { InspectorModeToggle, type InspectorTabMode } from "./context/inspector-mode-toggle"

export function ContextInspectorView({ workspaceId }: { workspaceId: string | null }) {
  const [tabMode, setTabMode] = useState<InspectorTabMode>("dashboard")
  const [selectedSource, setSelectedSource] = useState<CitedSource | null>(null)
  const modelId = useChatStore((state) => state.modelId)
  const modelLabel = useChatStore((state) => state.modelLabel)
  const mode = useChatStore((state) => state.mode)
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const workspaceName = useChatStore((state) => state.workspaceName)
  const changes = useChatStore((state) => state.changes)
  const chips = useSyncExternalStore(
    subscribeSessionContextChips,
    listSessionContextChips,
    listSessionContextChips
  )
  const mcpQuery = useQuery({
    queryKey: ["mcp-servers-context"],
    enabled: hasIde(),
    queryFn: () => getIde().mcp.servers() as Promise<McpServer[]>
  })
  const rulesQuery = useQuery({
    queryKey: ["workspace-rules-context", workspaceId],
    enabled: hasIde() && Boolean(workspaceId),
    queryFn: () => getIde().rules.list() as Promise<ProjectRuleItem[]>
  })
  const skillsQuery = useQuery({
    queryKey: ["workspace-skills-context", workspaceId],
    enabled: hasIde() && Boolean(workspaceId),
    queryFn: () => getIde().skills.list() as Promise<SkillItem[]>
  })
  const metricsQuery = useQuery({
    queryKey: ["latest-turn-metric"],
    enabled: hasIde(),
    queryFn: () => getIde().observability.metrics({ limit: 1 }) as Promise<TelemetryMetric[]>
  })

  if (selectedSource) {
    return <InspectorChunkDrawer source={selectedSource} onBack={() => setSelectedSource(null)} />
  }

  const tokenStats = estimateContextWindowStats(
    messages,
    modelId,
    mcpQuery.data ?? [],
    rulesQuery.data ?? [],
    skillsQuery.data ?? [],
    chips
  )
  const turnPerf = estimateTurnPerformance(metricsQuery.data?.[0] ?? null, messages, running)

  return (
    <div
      className={cx(
        "flex h-full min-h-0 flex-1 flex-col gap-2.5 overflow-hidden px-3.5 py-3",
        tabMode === "dashboard" && "select-none"
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-separator-border/60 pb-2">
        <InspectorModeToggle tabMode={tabMode} onChange={setTabMode} />
      </div>
      {tabMode === "raw" ? (
        <InspectorRawPrompt messages={messages} mode={mode} modelId={modelId} chips={chips} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5">
          <InspectorTokenSpectrum stats={tokenStats} />
          <InspectorTurnWatermark perf={turnPerf} />
          <InspectorGroundingCard
            workspaceName={workspaceName}
            changesCount={changes.length}
            chips={chips}
            sources={citedSourcesFromMessages(messages)}
            onSelectSource={setSelectedSource}
          />
          <InspectorToolsMatrix
            turnTools={toolsFromMessages(messages)}
            mcpServers={mcpQuery.data ?? []}
            running={running}
          />
          <InspectorRuntimeBar modelId={modelId} modelLabel={modelLabel} mode={mode} />
        </div>
      )}
    </div>
  )
}
