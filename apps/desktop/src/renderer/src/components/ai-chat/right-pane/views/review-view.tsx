/**
 * 审查栏：作用域过滤、Ctrl+P 跳文件、复制 patch、推送、提交框聚焦。
 */
import { useMemo, useRef } from "react"
import { useChatStore } from "@renderer/stores/chat-store"
import type { ChangedFileRow } from "@renderer/stores/chat-store"
import { ReviewHeader } from "./review/header/review-header"
import { ReviewJumpPalette } from "./review/header/review-jump-palette"
import { ReviewDiffStream } from "./review/diff-stream/review-diff-stream"
import { ReviewFileTree } from "./review/file-tree/review-file-tree"
import { ReviewCommitDock, type ReviewCommitDockHandle } from "./review/pr-hero/review-commit-dock"
import { CommitsTimeline } from "./review/commits/commits-timeline"
import { ReviewSplit } from "./review/review-split"
import { useWorkspaceGit } from "./review/use-workspace-git"
import { useReviewHotkeys } from "./review/use-review-hotkeys"
import { useReviewOptions } from "./review/hooks/use-review-options"
import { filterChangesByScope } from "./review/filter-review-changes"
import { pathsFromLastTurn } from "./review/last-turn-paths"

export function ReviewView({
  workspaceId,
  changes,
  additions,
  deletions,
  selectedFilePath,
  selectedFileContent,
  onSelectFile,
  active = true
}: {
  workspaceId: string | null
  changes: ChangedFileRow[]
  additions: number
  deletions: number
  selectedFilePath: string | null
  selectedFileContent: string
  onSelectFile: (path: string) => void
  active?: boolean
}) {
  const workspaceName = useChatStore((state) => state.workspaceName)
  const lastTurnKey = useChatStore((state) =>
    active ? pathsFromLastTurn(state.messages).join("\n") : ""
  )
  const {
    scope,
    setScope,
    options,
    toggleOption,
    allExpanded,
    toggleAllExpanded,
    jumpOpen,
    setJumpOpen
  } = useReviewOptions("last-turn")
  const git = useWorkspaceGit(workspaceId, {
    enabled: active,
    includeBranchFiles: active && scope === "branch"
  })
  const commitDockRef = useRef<ReviewCommitDockHandle>(null)

  const lastTurnPaths = useMemo(
    () => (lastTurnKey ? lastTurnKey.split("\n") : []),
    [lastTurnKey]
  )
  const scoped = useMemo(
    () => filterChangesByScope(changes, scope, lastTurnPaths, git.branchFiles),
    [changes, scope, lastTurnPaths, git.branchFiles]
  )
  const scopedAdds = scoped.reduce((sum, file) => sum + file.additions, 0)
  const scopedDels = scoped.reduce((sum, file) => sum + file.deletions, 0)

  useReviewHotkeys({
    enabled: active,
    changes: scoped,
    selectedFilePath,
    onSelectFile
  })

  async function copyPatch() {
    const paths = scoped.map((file) => file.path)
    const patch = await git.readPatch(paths)
    await navigator.clipboard.writeText(patch)
  }

  const header = (
    <ReviewHeader
      scope={scope}
      onSelectScope={setScope}
      currentBranch={git.branch}
      baseBranch={git.upstream}
      additions={scope === "uncommitted" ? additions : scopedAdds}
      deletions={scope === "uncommitted" ? deletions : scopedDels}
      options={options}
      onToggleOption={toggleOption}
      allExpanded={allExpanded}
      onToggleAllExpanded={toggleAllExpanded}
      onOpenJumpPalette={() => setJumpOpen(true)}
      onRefresh={() => void git.refresh()}
      isRefreshing={git.isRefreshing}
      onCopyApplyCmd={() => void copyPatch()}
      onCopyUnifiedDiff={() => void copyPatch()}
      onPrimaryCommit={() => commitDockRef.current?.focus()}
      onPrimaryPush={() => void git.pushChanges()}
    />
  )

  if (scope === "commits") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {header}
        <CommitsTimeline
          commits={git.commits}
          currentBranch={git.branch}
          workspaceName={workspaceName}
          isRefreshing={git.isRefreshing}
          onRefresh={git.refresh}
        />
      </div>
    )
  }

  const stream = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        <ReviewDiffStream
          workspaceId={workspaceId}
          changes={scoped}
          selectedFilePath={selectedFilePath}
          selectedFileContent={selectedFileContent}
          onSelectFile={onSelectFile}
          options={options}
          allExpanded={allExpanded}
        />
      </div>
      <div className="shrink-0 border-t border-separator-border bg-background-secondary-default/40 px-3 py-2">
        <ReviewCommitDock
          ref={commitDockRef}
          changesCount={scoped.length}
          onCommit={git.commitChanges}
          onPush={() => git.pushChanges()}
          onReadPatch={() => git.readPatch(scoped.map((file) => file.path))}
        />
      </div>
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      {header}
      {options.fileTreeVisible ? (
        <ReviewSplit
          tree={
            <ReviewFileTree
              changes={scoped}
              selectedFilePath={selectedFilePath}
              onSelectFile={onSelectFile}
            />
          }
        >
          {stream}
        </ReviewSplit>
      ) : (
        stream
      )}
      <ReviewJumpPalette
        open={jumpOpen}
        onOpenChange={setJumpOpen}
        changes={scoped}
        onSelectFile={onSelectFile}
      />
    </div>
  )
}
