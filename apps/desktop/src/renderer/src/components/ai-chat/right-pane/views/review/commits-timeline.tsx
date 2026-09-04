/**
 * Commits timeline：仓库头 + 竖轨节点列表。不伪造第二车道。
 */
import { RiGitCommitLine, RiRefreshLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { CommitRow } from "./commit-row"
import type { CommitListItem } from "./review.types"

export function CommitsTimeline(props: {
  commits: CommitListItem[]
  currentBranch: string
  workspaceName: string
  isRefreshing?: boolean
  onRefresh?: () => void
  onSelectCommit?: (hash: string) => void
}) {
  const { commits, currentBranch, workspaceName, isRefreshing, onRefresh, onSelectCommit } = props
  const t = useT()
  const branchLabel = currentBranch || t("chat.reviewDetached")
  const repoLabel = workspaceName || t("chat.reviewUnknownRepo")

  return (
    <div className="flex min-h-0 flex-1 flex-col text-text-primary">
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-separator-border px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate font-mono text-caption-2-medium text-text-tertiary">
            {t("chat.reviewRepository")} · {repoLabel}
          </p>
          <h2 className="mt-0.5 truncate text-title-3-semibold text-text-primary">
            {t("chat.reviewCommitsOn", { branch: branchLabel })}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-accent-500/10 px-1.5 py-0.5 font-mono text-caption-2-medium text-accent-500">
            {branchLabel}
          </span>
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title={t("chat.reviewRefreshHistory")}
              className="cursor-pointer rounded p-1 text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary"
            >
              <RiRefreshLine className={cx("size-3.5", isRefreshing && "animate-spin text-accent-500")} />
            </button>
          ) : null}
        </div>
      </div>

      {commits.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1.5 p-8 text-center text-text-tertiary">
          <RiGitCommitLine className="mb-1 size-8 opacity-40" />
          <span className="text-caption-1-medium text-text-secondary">{t("chat.reviewNoCommits")}</span>
          <span className="text-caption-2-regular">{t("chat.reviewNoCommitsHint")}</span>
        </div>
      ) : (
        <div className="relative min-h-0 flex-1 overflow-y-auto px-1 pb-4 pt-1">
          <div
            className="pointer-events-none absolute bottom-4 left-[19px] top-4 w-px bg-separator-border"
            aria-hidden
          />
          {commits.map((commit, index) => (
            <CommitRow
              key={commit.id}
              commit={commit}
              isHead={index === 0}
              branch={index === 0 ? branchLabel : undefined}
              onSelect={onSelectCommit}
            />
          ))}
        </div>
      )}
    </div>
  )
}
