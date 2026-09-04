/**
 * 本地未提交审查头：对齐 PR timeline 的标题 / 状态 / 统计，不含假 CI。
 */
import { RiGitBranchLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"

export function ChangesSummary(props: {
  workspaceName: string
  branch: string
  fileCount: number
  additions: number
  deletions: number
}) {
  const { workspaceName, branch, fileCount, additions, deletions } = props
  const t = useT()
  const repo = workspaceName || t("chat.reviewUnknownRepo")
  const branchLabel = branch || t("chat.reviewDetached")

  return (
    <div className="flex shrink-0 flex-col gap-1.5 border-b border-separator-border px-3 pb-2.5 pt-2">
      <p className="truncate font-mono text-caption-2-medium text-text-tertiary">
        {repo}
        <span className="text-text-tertiary/70"> › </span>
        {t("chat.paneReview")}
      </p>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-title-3-semibold text-text-primary">
            {t("chat.reviewWorkingTitle")}
          </h2>
          <p className="mt-0.5 truncate text-caption-2-medium text-text-secondary">
            {t("chat.reviewWantsToCommit", { n: fileCount, branch: branchLabel })}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full bg-accent-500/10 px-2 py-0.5 text-caption-2-medium text-accent-500">
          {t("chat.reviewOpenBadge")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-caption-2-medium text-text-tertiary">
        <span className="inline-flex items-center gap-1">
          <RiGitBranchLine className="size-3 text-accent-500" />
          <span className="font-mono text-accent-500">{branchLabel}</span>
        </span>
        <span aria-hidden>·</span>
        <span>{t("chat.reviewFilesCount", { n: fileCount })}</span>
        <span className="font-mono text-state-success-text">+{additions}</span>
        <span className="font-mono text-text-error-primary">-{deletions}</span>
      </div>
    </div>
  )
}
