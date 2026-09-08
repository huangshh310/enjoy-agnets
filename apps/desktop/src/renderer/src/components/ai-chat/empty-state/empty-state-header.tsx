/**
 * 空态标题 + 改动芯片。标题用 text-title-3；芯片点开 Inspector。
 */
import { RiGitBranchLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { expandInspector } from "@renderer/components/ai-chat/right-pane/open-pane"
import { useT } from "@renderer/i18n"

interface EmptyStateHeaderProps {
  sessionTitle?: string
  workspaceName?: string
  workspaceRootLabel?: string
  changesCount?: number
  className?: string
}

export function EmptyStateHeader({
  sessionTitle,
  workspaceName,
  workspaceRootLabel,
  changesCount = 0,
  className
}: EmptyStateHeaderProps) {
  const t = useT()
  const title = sessionTitle || workspaceName || workspaceRootLabel || t("chat.emptyWorkspace")

  return (
    <div className={cx("flex flex-col items-start gap-2 text-left select-none", className)}>
      <h1 className="text-title-3-semibold text-text-primary">{title}</h1>
      {changesCount > 0 ? (
        <button
          type="button"
          onClick={() => expandInspector()}
          className="inline-flex items-center gap-1 rounded-full border border-border-button-default bg-background-secondary-default px-2.5 py-0.5 text-caption-1-medium text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          <RiGitBranchLine className="size-3 text-accent-500" aria-hidden />
          {t("chat.emptyChangesChip", { count: changesCount })}
        </button>
      ) : null}
    </div>
  )
}
