/**
 * 空状态标题簇：居中工作区胶囊 + title-1 标题。强调词走 accent，不用 serif。
 */
import { RiFolder6Line, RiGitBranchLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"

interface EmptyStateHeaderProps {
  workspaceName?: string
  workspaceRootLabel?: string
  changesCount?: number
  className?: string
}

export function EmptyStateHeader({
  workspaceName,
  workspaceRootLabel,
  changesCount = 0,
  className
}: EmptyStateHeaderProps) {
  const t = useT()
  const activeLabel = workspaceName || workspaceRootLabel || t("chat.emptyWorkspace")
  return (
    <div className={cx("flex flex-col items-center text-center select-none", className)}>
      <div className="inline-flex items-center gap-2 rounded-full border border-border-button-default/70 bg-background-secondary-default/90 px-3.5 py-1 text-caption-1-medium text-text-secondary shadow-2xs backdrop-blur-md">
        <span className="relative flex size-2" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        <span className="inline-flex items-center gap-1.5 text-text-primary">
          <RiFolder6Line className="size-3.5 text-accent-500" aria-hidden />
          <span className="max-w-[180px] truncate">{activeLabel}</span>
        </span>
        <span className="text-text-tertiary/70">•</span>
        {changesCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-accent-600 dark:text-accent-400">
            <RiGitBranchLine className="size-3" aria-hidden />
            {t("chat.emptyChanges", { count: changesCount })}
          </span>
        ) : (
          <span className="text-text-tertiary">{t("chat.emptyReady")}</span>
        )}
      </div>
      <h1 className="mt-5 text-title-1-semibold text-text-primary">
        {t("chat.emptyHeadlineBefore")}
        <span className="text-accent-500">{t("chat.emptyHeadlineEm")}</span>
        {t("chat.emptyHeadlineAfter")}
      </h1>
      <p className="mt-2.5 max-w-lg text-body-medium text-text-secondary">
        {t("chat.emptyHint", { name: activeLabel })}
      </p>
    </div>
  )
}
