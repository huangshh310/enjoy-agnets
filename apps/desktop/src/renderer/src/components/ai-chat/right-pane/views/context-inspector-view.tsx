/**
 * 上下文检查器：仪表盘与原始载荷。数据在 useContextInspectorData。
 */
import { useState } from "react"
import type { CitedSource } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { InspectorTokenSpectrum } from "./context/inspector-token-spectrum"
import { InspectorCompactionCard } from "./context/compact-session"
import { InspectorTurnWatermark } from "./context/inspector-turn-watermark"
import { InspectorGroundingCard } from "./context/inspector-grounding-card"
import { InspectorToolsMatrix } from "./context/inspector-tools-matrix"
import { InspectorRuntimeBar } from "./context/inspector-runtime-bar"
import { InspectorChunkDrawer } from "./context/inspector-chunk-drawer"
import { InspectorRawPrompt } from "./context/inspector-raw-prompt"
import { InspectorModeToggle, type InspectorTabMode } from "./context/inspector-mode-toggle"
import { useContextInspectorData } from "./context/use-context-inspector-data"

export function ContextInspectorView({ workspaceId }: { workspaceId: string | null }) {
  const [tabMode, setTabMode] = useState<InspectorTabMode>("dashboard")
  const [selectedSource, setSelectedSource] = useState<CitedSource | null>(null)
  const data = useContextInspectorData(workspaceId)

  if (selectedSource) {
    return <InspectorChunkDrawer source={selectedSource} onBack={() => setSelectedSource(null)} />
  }

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
        <InspectorRawPrompt
          sessionId={data.sessionId}
          mode={data.mode}
          modelId={data.modelId}
          chips={data.chips}
        />
      ) : (
        <DashboardBody data={data} onSelectSource={setSelectedSource} />
      )}
    </div>
  )
}

function DashboardBody({
  data,
  onSelectSource
}: {
  data: ReturnType<typeof useContextInspectorData>
  onSelectSource: (source: CitedSource) => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5">
      <InspectorTokenSpectrum stats={data.tokenStats} compaction={data.compaction} modelLabel={data.modelLabel} />
      <InspectorCompactionCard sessionId={data.sessionId} messageCount={data.messages.length} />
      <InspectorTurnWatermark perf={data.turnPerf} />
      <InspectorGroundingCard
        workspaceName={data.workspaceName}
        changesCount={data.changesCount}
        chips={data.chips}
        sources={data.sources}
        onSelectSource={onSelectSource}
      />
      <InspectorToolsMatrix turnTools={data.turnTools} mcpServers={data.mcpServers} running={data.running} />
      <InspectorRuntimeBar
        modelId={data.modelId}
        modelLabel={data.modelLabel}
        mode={data.mode}
        contextWindow={data.contextWindow}
      />
    </div>
  )
}
