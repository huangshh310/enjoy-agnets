/**
 * 空态问候：工作区名走强调色。「N 项」芯片在元数据条，不跟标题抢行。
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
  workspaceName,
  workspaceRootLabel,
  className
}: EmptyStateHeaderProps) {
  const t = useT()
  const place = workspaceName || workspaceRootLabel
  const spoken = place ? t("chat.emptyAskTitle", { name: place }) : t("chat.emptyAskFallback")

  return (
    <div className={cx("flex flex-col items-center text-center select-none", className)}>
      <h1 aria-label={spoken} className="text-title-1-bold text-text-primary">
        {place ? (
          <>
            {t("chat.emptyAskLead")}
            <span className="text-accent-500">{place}</span>
            {t("chat.emptyAskTail")}
          </>
        ) : (
          t("chat.emptyAskFallback")
        )}
      </h1>
    </div>
  )
}

/** 改动芯片：点开 Inspector。给元数据条用。 */
export function EmptyStateChangesChip({ count }: { count: number }) {
  const t = useT()
  if (count <= 0) return null
  return (
    <button
      type="button"
      onClick={() => expandInspector()}
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption-2-medium text-text-secondary outline-none hover:bg-background-primary-default hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
    >
      <RiGitBranchLine className="size-3 text-accent-500" aria-hidden />
      {t("chat.emptyChangesChip", { count })}
    </button>
  )
}
