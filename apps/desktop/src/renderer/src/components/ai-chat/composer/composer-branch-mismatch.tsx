/**
 * 切分支后发送会跟到当前 checkout。空会话 / 同分支不画。
 */
import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { RiArrowRightLine, RiGitBranchLine } from "@remixicon/react"
import type { GitBranchesResult } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import {
  branchMismatchOf,
  loadSessionBranches,
  noteCurrentBranch,
  seedSessionBranch
} from "@renderer/lib/session-cwd-branch"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

let storageHydrated = false

export function ComposerBranchMismatch() {
  const t = useT()
  const sessionId = useChatStore((state) => state.sessionId)
  const workspaceId = useChatStore((state) => state.workspaceId)
  const hasUserTurns = useChatStore((state) => state.messages.some((item) => item.role === "user"))
  const branchesQuery = useQuery({
    queryKey: ["git-branches", workspaceId],
    enabled: hasIde() && Boolean(workspaceId),
    queryFn: () =>
      getIde().workspace.gitBranches({ workspaceId }) as Promise<GitBranchesResult>
  })
  const current = branchesQuery.data?.current?.trim() || ""

  useEffect(() => {
    if (storageHydrated) return
    storageHydrated = true
    loadSessionBranches()
  }, [])

  useEffect(() => {
    noteCurrentBranch(current)
    seedSessionBranch(sessionId ?? undefined, current)
  }, [sessionId, current])

  const mismatch = branchMismatchOf({
    sessionId,
    currentBranch: current,
    hasUserTurns
  })
  if (!mismatch) return null

  return (
    <div
      data-testid="composer-branch-mismatch"
      role="status"
      className="mb-2 flex w-full min-w-0 items-start gap-2 rounded-xl border border-border-button-default bg-background-primary-default px-3 py-2.5"
    >
      <RiGitBranchLine className="mt-0.5 size-4 shrink-0 text-text-secondary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-caption-1-medium text-text-primary">{t("chat.branchMismatchTitle")}</p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 font-mono text-caption-2-regular text-text-secondary">
          <span className="max-w-[40%] truncate" title={mismatch.recorded}>
            {mismatch.recorded}
          </span>
          <RiArrowRightLine className="size-3 shrink-0" aria-hidden />
          <span className="min-w-0 truncate font-medium text-text-primary" title={mismatch.current}>
            {mismatch.current}
          </span>
        </p>
      </div>
    </div>
  )
}
