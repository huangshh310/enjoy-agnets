/**
 * 来源组 / 已安装技能网格：展示 Bento 技能卡片或友好空态。
 */
import type { SkillSource, SkillTargetId } from "@enjoy-agents/ipc-contract"
import { SkillsCard } from "./skills-card"
import { SkillsEmptyState } from "./skills-empty-state"

export function SkillsGrid({
  sources,
  busy,
  activeTargetId,
  onClearTargetFilter,
  onSelect,
  onUpdate,
  onDeploy,
  onRemove,
  onPickFolder,
  onGoToStore
}: {
  sources: SkillSource[]
  busy: boolean
  activeTargetId?: SkillTargetId | null
  onClearTargetFilter?: () => void
  onSelect: (id: string) => void
  onUpdate: (id: string) => void
  onDeploy: (id: string) => void
  onRemove: (id: string) => void
  onPickFolder: () => void
  onGoToStore: () => void
}) {
  if (sources.length === 0) {
    return (
      <SkillsEmptyState
        activeTargetId={activeTargetId}
        onClearTargetFilter={onClearTargetFilter}
        onGoToStore={onGoToStore}
        onPickFolder={onPickFolder}
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
