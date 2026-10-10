/**
 * 右栏是否挂 glass/ink/sketch 外壳装饰（棱镜环、斜纹底）。
 * 审查空态、启动页、以及 review 列内任一空态面都不渲染装饰，禁止靠不透明底盖住。
 */
import { useMemo } from "react"
import { useChatStore } from "@renderer/stores/chat-store"
import { useRightPaneStore } from "@renderer/stores/right-pane-store"
import { pathsFromLastTurn } from "./views/review/last-turn-paths"
import { useWorkspaceCheckpoints } from "./views/review/use-workspace-checkpoints"
import { useWorkspaceGit } from "./views/review/use-workspace-git"
import { isReviewDecorEmpty, shouldRightPaneShellFrost } from "./right-pane-shell-frost.logic"

const EMPTY_MESSAGES: never[] = []
const EMPTY_CHANGES: never[] = []
const EMPTY_PATHS: string[] = []

export function useRightPaneShellFrost(workspaceId: string | null, changesLength: number) {
  const tabs = useRightPaneStore((state) => state.tabs)
  const activeId = useRightPaneStore((state) => state.activeId)
  const reviewScope = useRightPaneStore((state) => state.reviewScope)

  const emptyPicker = tabs.length === 0
  const activeTab = tabs.find((tab) => tab.id === activeId)
  const reviewActive = activeTab?.kind === "review"

  const messages = useChatStore((state) => (reviewActive ? state.messages : EMPTY_MESSAGES))
  const lastTurnPaths = useMemo(
    () => (reviewActive ? pathsFromLastTurn(messages) : EMPTY_PATHS),
    [reviewActive, messages]
  )

  const gitEnabled = reviewActive && reviewScope !== "checkpoints"
  const git = useWorkspaceGit(workspaceId, {
    enabled: gitEnabled,
    includeBranchFiles: gitEnabled && reviewScope === "branch"
  })
  const checkpoints = useWorkspaceCheckpoints(workspaceId, {
    enabled: reviewActive && reviewScope === "checkpoints"
  })

  const changes = useChatStore((state) => (reviewActive ? state.changes : EMPTY_CHANGES))

  const reviewDecorEmpty = useMemo(
    () =>
      isReviewDecorEmpty({
        reviewActive,
        reviewScope,
        changes,
        lastTurnPaths,
        branchFiles: git.branchFiles,
        commits: git.commits,
        checkpoints: checkpoints.items
      }),
    [
      reviewActive,
      reviewScope,
      changes,
      lastTurnPaths,
      git.branchFiles,
      git.commits,
      checkpoints.items,
      changesLength
    ]
  )

  const shellFrost = shouldRightPaneShellFrost({ emptyPicker, reviewActive, reviewDecorEmpty })

  return { shellFrost, reviewDecorEmpty, emptyPicker }
}
