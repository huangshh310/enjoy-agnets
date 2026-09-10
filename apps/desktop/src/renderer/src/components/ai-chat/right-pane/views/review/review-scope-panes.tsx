/**
 * Review 按作用域切换：检查点、提交历史、未提交 diff。
 */
import { CheckpointsList } from "./checkpoints/checkpoints-list"
import { CommitsTimeline } from "./commits/commits-timeline"
import { ReviewDiffStream } from "./diff-stream/review-diff-stream"
import { ReviewFileTree } from "./file-tree/review-file-tree"
import { ReviewJumpPalette } from "./header/review-jump-palette"
import { ReviewCommitDock } from "./pr-hero/review-commit-dock"
import { ReviewSplit } from "./review-split"
import { ReviewWiredHeader } from "./review-wired-header"
import type { ReviewViewModel } from "./use-review-view-model"

export function ReviewCheckpointsPane({ vm }: { vm: ReviewViewModel }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ReviewWiredHeader vm={vm} />
      <CheckpointsList
        items={vm.checkpoints.items}
        isRefreshing={vm.checkpoints.isRefreshing}
        error={vm.checkpoints.error}
        onRefresh={() => void vm.checkpoints.refresh()}
        onPreview={vm.checkpoints.preview}
        onRestore={vm.checkpoints.restore}
      />
    </div>
  )
}

export function ReviewCommitsPane({ vm }: { vm: ReviewViewModel }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ReviewWiredHeader vm={vm} />
      <CommitsTimeline
        commits={vm.git.commits}
        currentBranch={vm.git.branch}
        workspaceName={vm.workspaceName}
        isRefreshing={vm.git.isRefreshing}
        onRefresh={vm.git.refresh}
      />
    </div>
  )
}

export function ReviewChangesPane({ vm }: { vm: ReviewViewModel }) {
  const stream = <ReviewChangesStream vm={vm} />
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ReviewWiredHeader vm={vm} />
      {vm.options.fileTreeVisible ? (
        <ReviewSplit
          tree={
            <ReviewFileTree
              changes={vm.scoped}
              selectedFilePath={vm.selectedFilePath}
              onSelectFile={vm.onSelectFile}
              onStage={(path, action) => void vm.git.stagePaths([path], action)}
            />
          }
        >
          {stream}
        </ReviewSplit>
      ) : (
        stream
      )}
      <ReviewJumpPalette
        open={vm.jumpOpen}
        onOpenChange={vm.setJumpOpen}
        changes={vm.scoped}
        onSelectFile={vm.onSelectFile}
      />
    </div>
  )
}

function ReviewChangesStream({ vm }: { vm: ReviewViewModel }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        <ReviewDiffStream
          workspaceId={vm.workspaceId}
          changes={vm.scoped}
          selectedFilePath={vm.selectedFilePath}
          selectedFileContent={vm.selectedFileContent}
          onSelectFile={vm.onSelectFile}
          options={vm.options}
          allExpanded={vm.allExpanded}
        />
      </div>
      <div className="shrink-0 border-t border-separator-border bg-background-secondary-default/40 px-3 py-2">
        <ReviewCommitDock
          ref={vm.commitDockRef}
          changesCount={vm.changes.filter((file) => file.staged).length}
          onCommit={vm.git.commitChanges}
          onPush={() => vm.git.pushChanges()}
          onReadPatch={() => vm.git.readPatch(vm.scoped.map((file) => file.path))}
        />
      </div>
    </div>
  )
}
