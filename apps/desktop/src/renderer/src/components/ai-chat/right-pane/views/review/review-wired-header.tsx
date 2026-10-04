/**
 * 把 Review 模型接到顶栏：刷新、复制 patch、提交 / 推送。
 */
import { ReviewHeader } from "./header/review-header"
import type { ReviewViewModel } from "./use-review-view-model"

export function ReviewWiredHeader({ vm }: { vm: ReviewViewModel }) {
  return (
    <ReviewHeader
      scope={vm.scope}
      onSelectScope={vm.setScope}
      currentBranch={vm.git.branch}
      baseBranch={vm.git.upstream}
      additions={vm.scope === "uncommitted" ? vm.additions : vm.scopedAdds}
      deletions={vm.scope === "uncommitted" ? vm.deletions : vm.scopedDels}
      options={vm.options}
      palette={vm.palette}
      onPalette={vm.setPalette}
      onToggleOption={vm.toggleOption}
      allExpanded={vm.allExpanded}
      onToggleAllExpanded={vm.toggleAllExpanded}
      onOpenJumpPalette={() => vm.setJumpOpen(true)}
      onRefresh={() => {
        void vm.git.refresh()
        void vm.checkpoints.refresh()
      }}
      isRefreshing={vm.scope === "checkpoints" ? vm.checkpoints.isRefreshing : vm.git.isRefreshing}
      onCopyApplyCmd={() => void vm.copyPatch()}
      onCopyUnifiedDiff={() => void vm.copyPatch()}
      onPrimaryCommit={() => vm.commitDockRef.current?.focus()}
      onPrimaryPush={() => void vm.git.pushChanges()}
      showCommitPush={vm.scope !== "checkpoints" && vm.scope !== "commits"}
    />
  )
}
