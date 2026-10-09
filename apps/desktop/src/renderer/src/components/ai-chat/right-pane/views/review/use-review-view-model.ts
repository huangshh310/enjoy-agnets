/**
 * Review 栏状态：作用域过滤、Git、检查点、热键与复制 patch。
 */
import { useEffect, useMemo, useRef } from "react"
import { useChatStore } from "@renderer/stores/chat-store"
import { useRightPaneStore } from "@renderer/stores/right-pane-store"
import { filterChangesByScope } from "./filter-review-changes"
import type { ReviewScope } from "./types/review.types"
import { pathsFromLastTurn } from "./last-turn-paths"
import type { ReviewCommitDockHandle } from "./pr-hero/review-commit-dock"
import type { ReviewViewProps } from "./review-view-props"
import { useDiffPalette } from "./hooks/use-diff-palette"
import { useReviewOptions } from "./hooks/use-review-options"
import { useReviewHotkeys } from "./use-review-hotkeys"
import { useWorkspaceCheckpoints } from "./use-workspace-checkpoints"
import { useWorkspaceGit } from "./use-workspace-git"

export function useReviewViewModel(props: ReviewViewProps) {
  const active = props.active ?? true
  const workspaceName = useChatStore((state) => state.workspaceName)
  const scope = useRightPaneStore((state) => state.reviewScope)
  const setScope = useRightPaneStore((state) => state.setReviewScope)
  const { options, toggleOption, allExpanded, toggleAllExpanded, jumpOpen, setJumpOpen } =
    useReviewOptions()
  const { palette, setPalette } = useDiffPalette()
  const git = useWorkspaceGit(props.workspaceId, {
    enabled: active,
    includeBranchFiles: active && scope === "branch"
  })
  const checkpoints = useWorkspaceCheckpoints(props.workspaceId, {
    enabled: active && scope === "checkpoints"
  })
  const commitDockRef = useRef<ReviewCommitDockHandle>(null)
  const lastTurnPaths = useLastTurnPaths(active)
  useFallbackEmptyLastTurn(scope, lastTurnPaths.length, props.changes.length, setScope)
  const scoped = useMemo(
    () => filterChangesByScope(props.changes, scope, lastTurnPaths, git.branchFiles),
    [props.changes, scope, lastTurnPaths, git.branchFiles]
  )
  useReviewHotkeys({
    enabled: active,
    changes: scoped,
    selectedFilePath: props.selectedFilePath,
    onSelectFile: props.onSelectFile
  })
  return {
    ...props,
    workspaceName,
    scope,
    setScope,
    git,
    checkpoints,
    commitDockRef,
    scoped,
    scopedAdds: scoped.reduce((sum, file) => sum + file.additions, 0),
    scopedDels: scoped.reduce((sum, file) => sum + file.deletions, 0),
    options,
    palette,
    setPalette,
    toggleOption,
    allExpanded,
    toggleAllExpanded,
    jumpOpen,
    setJumpOpen,
    copyPatch: () => copyScopedPatch(git.readPatch, scoped)
  }
}

function useLastTurnPaths(active: boolean): string[] {
  const lastTurnKey = useChatStore((state) =>
    active ? pathsFromLastTurn(state.messages).join("\n") : ""
  )
  return useMemo(() => (lastTurnKey ? lastTurnKey.split("\n") : []), [lastTurnKey])
}

function useFallbackEmptyLastTurn(
  scope: string,
  lastTurnCount: number,
  changeCount: number,
  setScope: (scope: ReviewScope) => void
) {
  useEffect(() => {
    if (scope === "last-turn" && lastTurnCount === 0 && changeCount > 0) {
      setScope("uncommitted")
    }
  }, [scope, lastTurnCount, changeCount, setScope])
}

async function copyScopedPatch(
  readPatch: (paths: string[]) => Promise<string>,
  scoped: Array<{ path: string }>
) {
  const patch = await readPatch(scoped.map((file) => file.path))
  await navigator.clipboard.writeText(patch)
}

export type ReviewViewModel = ReturnType<typeof useReviewViewModel>
