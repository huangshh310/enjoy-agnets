/**
 * L1 胶囊：runtime 标 · 会话名 · kind · 相对时间。当前会话 Dock 已开时收成微点。
 */
import { RiCloseLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { SessionAgentMark } from "@renderer/components/ai-chat/sidebar/session-agent-mark"
import { useT } from "@renderer/i18n"
import type { AttentionItem, AttentionKind } from "@renderer/stores/attention/attention.types"
import { attentionTimeLabel } from "./attention-time"

const KIND_DOT: Record<AttentionKind, string> = {
  pending_approval: "bg-text-error-primary",
  ask_user: "bg-text-error-primary",
  error: "bg-text-error-primary",
  complete: "bg-accent-600"
}

export function AttentionChip(props: {
  item: AttentionItem
  compact: boolean
  now: number
  onOpen: (item: AttentionItem) => void
  onDismiss?: (item: AttentionItem) => void
}) {
  const t = useT()
  const { item, compact, now, onOpen, onDismiss } = props
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onOpen(item)}
        aria-label={t("attention.currentSession")}
        className="flex size-4 shrink-0 items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        <span className={cx("size-1.5 rounded-full", KIND_DOT[item.kind])} aria-hidden />
      </button>
    )
  }

  return (
    <div
      className={cx(
        "group flex h-7 max-w-[280px] animate-in fade-in items-center gap-1.5 rounded-full border border-border-button-default/70",
        "bg-background-secondary-default/80 pl-2.5 pr-1.5 shadow-2xs outline-none duration-200 transition-all",
        "hover:bg-background-secondary-hover hover:border-border-button-hover"
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-left focus-visible:outline-none"
      >
        <SessionAgentMark sessionId={item.sessionId} size={14} />
        <span className="min-w-0 truncate text-caption-2-medium text-text-primary">
          {item.sessionTitle}
        </span>
        <KindMark kind={item.kind} />
        <span className="shrink-0 text-caption-2-medium text-text-tertiary">
          {t(`attention.kind.${item.kind}`)}
        </span>
        <span className="shrink-0 text-caption-2-regular text-text-tertiary">
          {attentionTimeLabel(item.occurredAt, now, t)}
        </span>
      </button>
      {onDismiss ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDismiss(item)
          }}
          title={t("attention.dismiss")}
          aria-label={t("attention.dismiss")}
          className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-tertiary opacity-50 transition-all hover:bg-background-tertiary-default hover:text-text-primary hover:opacity-100"
        >
          <RiCloseLine className="size-3" />
        </button>
      ) : null}
    </div>
  )
}

function KindMark({ kind }: { kind: AttentionKind }) {
  if (kind === "complete") return null
  return <span className={cx("size-1.5 shrink-0 rounded-full", KIND_DOT[kind])} aria-hidden />
}
