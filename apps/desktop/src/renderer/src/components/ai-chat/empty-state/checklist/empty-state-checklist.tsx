/**
 * 空态元数据条：改动 / 已就绪 / 未安装收成一粒，展开才出名单。
 */
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { EmptyStateChangesChip } from "../empty-state-header"
import { splitEmptyStateTools, shouldExpandMissing } from "./empty-state-checklist-model"
import { EmptyStateMissingBlock } from "./empty-state-missing-block"
import { EmptyStateReadyBlock } from "./empty-state-ready-block"

export function EmptyStateChecklist({ changesCount = 0 }: { changesCount?: number }) {
  const tools = useSettingsSnapshot().data?.agentTools ?? []
  const { ready, missing } = splitEmptyStateTools(tools)
  const showChanges = changesCount > 0
  const showReady = ready.length > 0
  const showMissing = missing.length > 0
  const showDock = showChanges || showReady || showMissing

  if (!showDock) {
    return (
      <div className="flex h-auto w-full max-w-lg flex-col items-center">
        <EmptyStateReadyBlock ready={ready} />
      </div>
    )
  }

  return (
    <div className="flex h-auto w-full max-w-lg flex-col items-center">
      <div className="inline-flex items-center rounded-full bg-background-secondary-default p-1">
        {showChanges ? <EmptyStateChangesChip count={changesCount} /> : null}
        {showChanges && (showReady || showMissing) ? <MetaRule /> : null}
        {showReady ? <EmptyStateReadyBlock ready={ready} /> : null}
        {showReady && showMissing ? <MetaRule /> : null}
        <EmptyStateMissingBlock
          missing={missing}
          defaultOpen={shouldExpandMissing(ready.length, missing.length)}
        />
      </div>
    </div>
  )
}

function MetaRule() {
  return <span aria-hidden className="mx-0.5 h-3 w-px bg-separator-border" />
}
