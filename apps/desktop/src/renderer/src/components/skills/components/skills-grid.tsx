/**
 * 来源组网格：展示来源卡片或筛选空态。
 */
import type { CuratedSkillSource, SkillSource, SkillTargetId } from "@enjoy-agents/ipc-contract"
import { SkillsCard } from "./skills-card"
import { SkillsEmptyState } from "./skills-empty-state"

export function SkillsGrid({
  sources,
  curated,
  busy,
  activeTargetId,
  onClearTargetFilter,
  onSelect,
  onUpdate,
  onDeploy,
  onRemove,
  onAddGit,
  onPickFolder,
  onInstallCurated
}: {
  sources: SkillSource[]
  curated: CuratedSkillSource[]
  busy: boolean
  activeTargetId?: SkillTargetId | null
  onClearTargetFilter?: () => void
  onSelect: (id: string) => void
  onUpdate: (id: string) => void
  onDeploy: (id: string) => void
  onRemove: (id: string) => void
  onAddGit: (origin: string) => void
  onPickFolder: () => void
  onInstallCurated: (source: CuratedSkillSource) => void
}) {
  if (sources.length === 0) {
    return (
      <SkillsEmptyState
        curated={curated}
        busy={busy}
        activeTargetId={activeTargetId}
        onClearTargetFilter={onClearTargetFilter}
        onAddGit={onAddGit}
        onPickFolder={onPickFolder}
        onInstallCurated={onInstallCurated}
      />
    )
  }

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {sources.map((source) => (
        <SkillsCard
          key={source.id}
          source={source}
          busy={busy}
          onSelect={() => onSelect(source.id)}
          onUpdate={() => onUpdate(source.id)}
          onDeploy={() => onDeploy(source.id)}
          onRemove={() => onRemove(source.id)}
        />
      ))}
    </div>
  )
}
