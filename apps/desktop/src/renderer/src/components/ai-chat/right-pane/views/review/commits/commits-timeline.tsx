/**
 * devl.dev 风格提交时间线主组件：
 * 对齐 https://www.devl.dev/c/timelines/commits 交互：
 * - 仓库头 (Repository · repo | Commits on branch)
 * - 左侧背景层：平滑的多色 SVG 分支贝塞尔曲线导轨
 * - 右侧列表层：高密度、结构化的提交节点行
 */

import { RiGitCommitLine, RiRefreshLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import type { CommitListItem } from "../types/review.types"
import { CommitsGraphSvg } from "./commits-graph-svg"
import { CommitRow } from "./commit-row"

export function CommitsTimeline(props: {
  commits: CommitListItem[]
  currentBranch: string
  workspaceName: string
  isRefreshing?: boolean
  onRefresh?: () => void
  onSelectCommit?: (hash: string) => void
}) {
  const {
    commits,
    currentBranch,
    workspaceName,
    isRefreshing,
    onRefresh,
    onSelectCommit
  } = props
  const t = useT()

  const branchLabel = currentBranch || t("chat.reviewDetached")
  const repoLabel = workspaceName || t("chat.reviewUnknownRepo")

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background-primary-default select-none">
      {/* devl.dev 风格标头 */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-separator-border bg-background-primary-default px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="truncate font-mono text-caption-2-regular text-text-tertiary">
            {t("chat.reviewRepository")} · {repoLabel}
          </p>
          <h2 className="mt-0.5 truncate text-title-3-semibold text-text-primary">
            {t("chat.reviewCommitsOn", { branch: branchLabel })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-accent-500/10 px-2 py-0.5 font-mono text-caption-2-medium text-accent-500 border border-accent-500/20">
            {branchLabel}
          </span>

          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title={t("chat.reviewRefreshHistory")}
              className="cursor-pointer rounded-md p-1.5 text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary transition-colors"
            >
              <RiRefreshLine className={`size-4 ${isRefreshing ? "animate-spin text-accent-500" : ""}`} />
            </button>
          ) : null}
        </div>
      </div>

      {/* 提交图谱与节点列表 */}
      {commits.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-8 text-center text-text-tertiary">
          <RiGitCommitLine className="mb-1 size-8 opacity-40 text-accent-500" />
          <span className="text-caption-1-medium text-text-secondary">{t("chat.reviewNoCommits")}</span>
          <span className="text-caption-2-regular">{t("chat.reviewNoCommitsHint")}</span>
        </div>
      ) : (
        <div className="relative min-h-0 flex-1 overflow-y-auto">
          {/* 背景多色 SVG 分支连线图 */}
          <CommitsGraphSvg commits={commits} />

          {/* 前景各提交项 */}
          <div className="relative z-10 flex flex-col">
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
        </div>
      )}
    </div>
  )
}
