/**
 * t3-b：Composer「排队 n 项」轻芯片；点开可编辑列表（改/删/调序）。
 * 队列叙事仍在线程末虚线泡；这里不堆第二条进度假铬，也不露 Queue/Steer 英文。
 */
import { useEffect, useState, type ReactNode } from "react"
import { RiArrowDownSLine, RiArrowUpSLine, RiCloseLine, RiEditLine } from "@remixicon/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import {
  listFollowups,
  moveFollowup,
  subscribeFollowups,
  type FollowupItem
} from "@renderer/hooks/followup-queue"
import { discardFollowup, returnFollowupToComposer } from "@renderer/hooks/runtime-interact/followup-actions"
import { useChatStore } from "@renderer/stores/chat-store"

export function ComposerQueueChip() {
  const t = useT()
  const sessionId = useChatStore((state) => state.sessionId)
  const [items, setItems] = useState<FollowupItem[]>(() => listFollowups(sessionId))
  useEffect(() => {
    const sync = () => setItems(listFollowups(sessionId))
    sync()
    return subscribeFollowups(sync)
  }, [sessionId])

  if (!sessionId || items.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="composer-queue-chip"
          className={cx(
            "inline-flex h-6 max-w-[12rem] shrink-0 items-center gap-1 rounded-full border border-border-button-default",
            "bg-background-secondary-default px-2 text-caption-2-medium text-text-secondary",
            "hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring outline-none cursor-pointer"
          )}
          aria-label={t("chat.runtimeQueueChip", { n: items.length })}
          title={t("chat.runtimeQueueChipHint")}
        >
          <span className="truncate">{t("chat.runtimeQueueChip", { n: items.length })}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={8}
        className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 shadow-dropdown"
      >
        <ul className="flex max-h-56 flex-col gap-0.5 overflow-y-auto" role="list">
          {items.map((item, index) => (
            <QueueChipRow
              key={item.id}
              item={item}
              canMoveUp={index > 0}
              canMoveDown={index < items.length - 1}
            />
          ))}
        </ul>
        <button
          type="button"
          className="mt-1 w-full rounded-xl px-2 py-1.5 text-left text-caption-2-regular text-text-tertiary hover:bg-background-secondary-hover hover:text-text-secondary cursor-pointer"
          onClick={() => {
            document.getElementById("queued-followups")?.scrollIntoView({ behavior: "smooth", block: "nearest" })
          }}
        >
          {t("chat.runtimeJumpToQueue")}
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function QueueChipRow({
  item,
  canMoveUp,
  canMoveDown
}: {
  item: FollowupItem
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const t = useT()
  const preview = (item.draft ?? item.prompt).replace(/\s+/g, " ").trim() || t("chat.runtimeQueuedBubble")
  return (
    <li className="flex items-start gap-1 rounded-xl px-1.5 py-1 hover:bg-background-secondary-hover/70">
      <p className="min-w-0 flex-1 truncate pt-0.5 text-caption-1-regular text-text-primary" title={preview}>
        {preview.slice(0, 120)}
      </p>
      <div className="flex shrink-0 items-center gap-0.5">
        <IconBtn
          label={t("chat.runtimeMoveUp")}
          disabled={!canMoveUp}
          onClick={() => moveFollowup(item.id, -1)}
        >
          <RiArrowUpSLine className="size-3.5" aria-hidden />
        </IconBtn>
        <IconBtn
          label={t("chat.runtimeMoveDown")}
          disabled={!canMoveDown}
          onClick={() => moveFollowup(item.id, 1)}
        >
          <RiArrowDownSLine className="size-3.5" aria-hidden />
        </IconBtn>
        <IconBtn label={t("chat.runtimeEditFollowup")} onClick={() => returnFollowupToComposer(item)}>
          <RiEditLine className="size-3.5" aria-hidden />
        </IconBtn>
        <IconBtn label={t("chat.runtimeRemoveFollowup")} onClick={() => discardFollowup(item)}>
          <RiCloseLine className="size-3.5" aria-hidden />
        </IconBtn>
      </div>
    </li>
  )
}

function IconBtn({
  label,
  disabled,
  onClick,
  children
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex size-6 items-center justify-center rounded-md text-text-tertiary",
        disabled
          ? "opacity-30 cursor-not-allowed"
          : "hover:bg-background-secondary-hover hover:text-text-primary cursor-pointer"
      )}
    >
      {children}
    </button>
  )
}
