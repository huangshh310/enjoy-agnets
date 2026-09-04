/**
 * PR 审查 Hero 状态卡片组件：
 * 对齐 devl.dev PR Timeline 视觉范式：
 * - 面包屑导航 (repo › pulls › working-tree)
 * - 标题与状态药丸 (Open / 未提交)
 * - 意图说明 (wants to merge into branch)
 * - 就绪检查徽标 (无冲突 / 差异就绪 / 文件改动数)
 * - 内嵌快捷提交底栏
 */

import {
  RiCheckLine,
  RiGitBranchLine,
  RiGitPullRequestLine,
  RiShieldCheckLine
} from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { ReviewCommitDock } from "./review-commit-dock"

export function PrTimelineHero(props: {
  workspaceName: string
  branch: string
  fileCount: number
  additions: number
  deletions: number
  onCommit?: (message: string) => Promise<{ ok: boolean; output?: string }>
}) {
  const {
    workspaceName,
    branch,
    fileCount,
    additions,
    deletions,
    onCommit
  } = props
  const t = useT()

  const repo = workspaceName || t("chat.reviewUnknownRepo")
  const branchLabel = branch || t("chat.reviewDetached")

  return (
    <div className="flex shrink-0 flex-col gap-2.5 border-b border-separator-border bg-background-primary-default px-3.5 py-3 select-none">
      {/* 面包屑导航 */}
      <div className="flex items-center gap-1 font-mono text-[11px] text-text-tertiary">
        <span className="truncate">{repo}</span>
        <span className="text-text-tertiary/60">›</span>
        <span>pulls</span>
        <span className="text-text-tertiary/60">›</span>
        <span className="text-text-secondary">working-tree</span>
      </div>

      {/* 标题行与 Open 状态药丸 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-title-3-semibold text-text-primary">
            {t("chat.reviewWorkingTitle")}
          </h2>
          <p className="mt-0.5 truncate text-caption-2-medium text-text-secondary">
            {t("chat.reviewWantsToCommit", { n: fileCount, branch: branchLabel })}
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-caption-2-medium font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <RiGitPullRequestLine className="size-3" />
          <span>{t("chat.reviewOpenBadge")}</span>
        </span>
      </div>

      {/* devl.dev 就绪检查清单微标行 (Checklist Bar) */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-text-secondary">
        <span className="inline-flex items-center gap-1 rounded-md bg-background-secondary-default/70 px-1.5 py-0.5 border border-separator-border/50">
          <RiShieldCheckLine className="size-3 text-emerald-500" />
          <span>{t("chat.reviewNoConflicts")}</span>
        </span>

        <span className="inline-flex items-center gap-1 rounded-md bg-background-secondary-default/70 px-1.5 py-0.5 border border-separator-border/50">
          <RiCheckLine className="size-3 text-accent-500" />
          <span>{t("chat.reviewDiffReady")}</span>
        </span>

        <span className="inline-flex items-center gap-1 rounded-md bg-background-secondary-default/70 px-1.5 py-0.5 font-mono border border-separator-border/50">
          <RiGitBranchLine className="size-3 text-accent-500" />
          <span className="text-accent-500">{branchLabel}</span>
        </span>

        <div className="ml-auto inline-flex items-center gap-1 font-mono text-caption-2-medium">
          <span className="text-state-success-text">+{additions}</span>
          <span className="text-text-error-primary">-{deletions}</span>
        </div>
      </div>

      {/* 快捷提交控制台 */}
      <ReviewCommitDock changesCount={fileCount} onCommit={onCommit} />
    </div>
  )
}
