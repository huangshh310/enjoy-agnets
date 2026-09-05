/**
 * 记忆层非对称 Bento：脉冲 span-6、透镜 span-3、健康 span-3。
 */
import type { KnowledgeSource } from "@enjoy-agents/ipc-contract"
import type { KnowledgeLens, KnowledgeStats } from "../../types/knowledge-ui.types"
import { KnowledgeHealthCard } from "./knowledge-health-card"
import { KnowledgeLensCard } from "./knowledge-lens-card"
import { KnowledgePulseCard } from "./knowledge-pulse-card"

export function KnowledgeMemoryBento({
  stats,
  lenses,
  sources,
  selectedFolder,
  hitSourceIds,
  hasSearched,
  onSelectFolder,
  onToggleLens,
  onSetDefault,
  onOpenDrawer,
  onEditSource,
  onRemoveSource
}: {
  stats: KnowledgeStats
  lenses: KnowledgeLens[]
  sources: KnowledgeSource[]
  selectedFolder: string | null
  hitSourceIds: string[]
  hasSearched: boolean
  onSelectFolder: (path: string | null) => void
  onToggleLens: (id: string) => void
  onSetDefault: (id: string) => void
  onOpenDrawer: () => void
  onEditSource?: (source: KnowledgeSource) => void
  onRemoveSource?: (sourceId: string) => void
}) {
  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-12">
      <KnowledgePulseCard
        stats={stats}
        onOpenDrawer={onOpenDrawer}
      />
      <KnowledgeLensCard
        lenses={lenses}
        selectedFolder={selectedFolder}
        hitSourceIds={hitSourceIds}
        hasSearched={hasSearched}
        onSelectFolder={onSelectFolder}
        onToggleLens={onToggleLens}
        onSetDefault={onSetDefault}
      />
      <KnowledgeHealthCard
        unavailable={stats.unavailable}
        sources={sources}
        onOpenDrawer={onOpenDrawer}
        onEditSource={onEditSource}
        onRemoveSource={onRemoveSource}
      />
    </div>
  )
}
