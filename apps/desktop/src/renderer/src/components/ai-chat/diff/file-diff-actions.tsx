/**
 * 每文件「留下」「丢掉」按钮；已决折成 stub。文案复用草稿确认同词。
 */
import { RiCheckLine, RiCloseLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { FileDiffDecision } from "./file-diff-decision"

export function FileDiffActions({
  decision,
  disabled,
  busy,
  onKeep,
  onDiscard,
  className
}: {
  decision: FileDiffDecision
  disabled?: boolean
  busy?: boolean
  onKeep: () => void
  onDiscard: () => void
  className?: string
}) {
  const t = useT()
  if (decision === "kept") {
    return (
      <span className={cx("inline-flex items-center gap-1 text-caption-2-medium text-state-success-text", className)}>
        <RiCheckLine className="size-3.5" />
        {t("chat.diffFileKept")}
      </span>
    )
  }
  if (decision === "discarded") {
    return (
      <span className={cx("inline-flex items-center gap-1 text-caption-2-medium text-text-tertiary", className)}>
        <RiCloseLine className="size-3.5" />
        {t("chat.diffFileDiscarded")}
      </span>
    )
  }
  return (
    <div className={cx("inline-flex items-center gap-1", className)}>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={(e) => {
          e.stopPropagation()
          onKeep()
        }}
        className="cursor-pointer rounded-md px-1.5 py-0.5 text-caption-2-medium text-state-success-text hover:bg-state-success-text/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t("chat.sessionTabs.keep")}
      </button>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={(e) => {
          e.stopPropagation()
          onDiscard()
        }}
        className="cursor-pointer rounded-md px-1.5 py-0.5 text-caption-2-medium text-text-secondary hover:bg-background-secondary-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t("chat.sessionTabs.discard")}
      </button>
    </div>
  )
}
