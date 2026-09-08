/**
 * 空态工作区胶囊：左对齐，不要居中营销标题。
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
    <div className={cx("flex flex-col items-start text-left select-none", className)}>
      <div className="inline-flex items-center gap-2 rounded-full border border-border-button-default bg-background-secondary-default px-3 py-1 text-caption-1-medium text-text-secondary">
        <RiFolder6Line className="size-3.5 text-accent-500" aria-hidden />
        <span className="max-w-[180px] truncate text-text-primary">{activeLabel}</span>
        <span className="text-text-tertiary">·</span>
        {changesCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-text-secondary">
            <RiGitBranchLine className="size-3" aria-hidden />
            {t("chat.emptyChanges", { count: changesCount })}
          </span>
        ) : (
          <span className="text-text-tertiary">{t("chat.emptyReady")}</span>
        )}
      </div>
    </div>
  )
}
