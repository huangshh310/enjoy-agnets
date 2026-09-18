/**
 * 对话末尾的虚线用户气泡：排队是时间线的一部分，不是 Composer 上一条折叠条。
 */
import { RiArrowDownSLine, RiArrowUpSLine, RiCloseLine, RiSendPlaneLine } from "@remixicon/react"
import { Message } from "@/components/ai-elements/message"
import { cx } from "@/utils/cx"
import { returnFollowupToComposer, sendFollowupNow } from "@renderer/hooks/runtime-interact/followup-actions"
import { moveFollowup, takeFollowup, type FollowupItem } from "@renderer/hooks/followup-queue"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function QueuedUserTurn({
  item,
  canMoveUp,
  canMoveDown
}: {
  item: FollowupItem
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const t = useT()
  const running = useChatStore((state) => state.running)
  const preview = (item.draft ?? item.prompt).trim()
  const extraCount = (item.quotedContexts?.length ?? 0) + item.assets.length + (item.skillChips?.length ?? 0)

  return (
    <Message
      from="user"
      data-testid="queued-user-turn"
      data-queued-id={item.id}
      className="ml-auto flex max-w-[min(32rem,88%)] flex-col items-end gap-1.5 opacity-80"
    >
      <div
        className={cx(
          "w-fit max-w-full rounded-2xl border border-dashed border-border-button-default",
          "bg-background-secondary-default/50 px-3.5 py-2.5 text-caption-1-regular text-text-secondary"
        )}
      >
        {preview ? <p className="whitespace-pre-wrap break-words">{preview}</p> : null}
        {extraCount > 0 ? (
          <p className={cx("text-caption-2-regular text-text-tertiary", preview && "mt-1.5")}>
            {t("chat.runtimeQueuedExtras", { n: extraCount })}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-caption-2-medium">
          <span className="text-text-tertiary">{t("chat.runtimeQueuedBubble")}</span>
          <button type="button" className={iconClass} disabled={!canMoveUp} onClick={() => moveFollowup(item.id, -1)}>
            <RiArrowUpSLine className="size-3.5" aria-hidden />
            <span className="sr-only">{t("chat.runtimeMoveUp")}</span>
          </button>
          <button type="button" className={iconClass} disabled={!canMoveDown} onClick={() => moveFollowup(item.id, 1)}>
            <RiArrowDownSLine className="size-3.5" aria-hidden />
            <span className="sr-only">{t("chat.runtimeMoveDown")}</span>
          </button>
          <button type="button" className={actionClass} onClick={() => void sendFollowupNow(item)}>
            <RiSendPlaneLine className="size-3.5" aria-hidden />
            {running ? t("chat.runtimeSteerItem") : t("chat.runtimeSendNow")}
          </button>
          <button type="button" className={actionClass} onClick={() => returnFollowupToComposer(item)}>
            {t("chat.runtimeReturnToComposer")}
          </button>
          <button
            type="button"
            aria-label={t("chat.runtimeRemoveFollowup")}
            onClick={() => takeFollowup(item.id)}
            className={iconClass}
          >
            <RiCloseLine className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </Message>
  )
}

const actionClass =
  "inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-accent-500 hover:bg-accent-500/10"

const iconClass =
  "inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary disabled:cursor-default disabled:opacity-30"
