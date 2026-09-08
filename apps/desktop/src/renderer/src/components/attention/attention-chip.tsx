/**
 * L1 单条芯片：会话名 + kind。完成/错误可忽略。
 */
import {
  RiCheckboxCircleLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiQuestionLine,
  RiShieldKeyholeLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { AttentionItem, AttentionKind } from "@renderer/stores/attention/attention.types"

const GLYPH: Record<AttentionKind, typeof RiShieldKeyholeLine> = {
  pending_approval: RiShieldKeyholeLine,
  ask_user: RiQuestionLine,
  error: RiErrorWarningLine,
  complete: RiCheckboxCircleLine
}

const TONE: Record<AttentionKind, string> = {
  pending_approval: "text-amber-500",
  ask_user: "text-accent-500",
  error: "text-text-error-primary",
  complete: "text-emerald-500"
}

export function AttentionChip(props: {
  item: AttentionItem
  onOpen: (item: AttentionItem) => void
  onDismiss: (id: string) => void
}) {
  const t = useT()
  const { item, onOpen, onDismiss } = props
  const Glyph = GLYPH[item.kind]
  const canDismiss = item.kind === "complete" || item.kind === "error"

  return (
    <div className="flex max-w-full items-center gap-0.5">
      <button
        type="button"
        onClick={() => onOpen(item)}
        className={cx(
          "flex max-w-[280px] items-center gap-1.5 rounded-full border border-border-button-default",
          "bg-background-secondary-default px-2.5 py-1 outline-none",
          "hover:bg-background-secondary-hover",
          "focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        )}
      >
        <Glyph className={cx("size-3.5 shrink-0", TONE[item.kind])} aria-hidden />
        <span className="min-w-0 truncate text-caption-1-medium text-text-primary">
          {item.sessionTitle}
        </span>
        <span className="shrink-0 text-caption-2-medium text-text-tertiary">
          {t(`attention.kind.${item.kind}`)}
        </span>
      </button>
      {canDismiss ? (
        <button
          type="button"
          aria-label={t("attention.dismiss")}
          onClick={() => onDismiss(item.id)}
          className="rounded-full p-1 text-foreground-icon-quaternary outline-none hover:bg-background-tertiary-default hover:text-foreground-icon-secondary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          <RiCloseLine className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
