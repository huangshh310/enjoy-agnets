/**
 * 对话末尾的虚线用户气泡：排队是时间线的一部分，不是 Composer 上一条折叠条。
 */
import { RiArrowDownSLine, RiArrowUpSLine, RiAttachment2, RiCloseLine, RiSendPlaneLine } from "@remixicon/react"
import { Message } from "@/components/ai-elements/message"
import { cx } from "@/utils/cx"
import { discardFollowup, returnFollowupToComposer, sendFollowupNow } from "@renderer/hooks/runtime-interact/followup-actions"
import { moveFollowup, type FollowupItem } from "@renderer/hooks/followup-queue"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { queuedExtrasLabel } from "../../composer-count-labels"
import { QUEUE_LINK_BUBBLE, QUEUE_LINK_DOCK, QUEUE_MUTED_TEXT, queuedRowLabelKey } from "../queue-paused-view"

export function QueuedUserTurn({
  item,
  canMoveUp,
  canMoveDown,
  compact = false,
  paused = false
}: {
  item: FollowupItem
  canMoveUp: boolean
  canMoveDown: boolean
  /** 审批卡上方的单行紧凑版：预览截断，按钮整行露出。 */
  compact?: boolean
  /** E1：队列停着（含审批卡在、说明行让位时）→ 标签说「已暂停」，不说「排队中」（luna P3a）。 */
  paused?: boolean
}) {
  const t = useT()
  const running = useChatStore((state) => state.running)
  const preview = (item.draft ?? item.prompt).trim()
  const label = t(queuedRowLabelKey(paused))
  // luna #163（10-21）：「马上发给它 / 退回输入框」≥ 4.5:1（亮 / 暗）。时间线泡整体 opacity-80，同一个色不够，单独用深一档的。
  const actionClass = `${actionBaseClass} ${compact ? QUEUE_LINK_DOCK : QUEUE_LINK_BUBBLE}`
  const extraCount = (item.quotedContexts?.length ?? 0) + item.assets.length + (item.skillChips?.length ?? 0)

  const actions = (
    <>
      <button type="button" className={iconClass} disabled={!canMoveUp} onClick={() => moveFollowup(item.id, -1)}>
        <RiArrowUpSLine className="size-3.5" aria-hidden />
        <span className="sr-only">{t("chat.runtimeMoveUp")}</span>
      </button>
      <button type="button" className={iconClass} disabled={!canMoveDown} onClick={() => moveFollowup(item.id, 1)}>
        <RiArrowDownSLine className="size-3.5" aria-hidden />
        <span className="sr-only">{t("chat.runtimeMoveDown")}</span>
      </button>
      <button
        type="button"
        data-testid="queued-send-now"
        className={actionClass}
        onClick={() => void sendFollowupNow(item)}
      >
        <RiSendPlaneLine className="size-3.5" aria-hidden />
        {running ? t("chat.runtimeSteerItem") : t("chat.runtimeSendNow")}
      </button>
      <button
        type="button"
        data-testid="queued-return"
        className={actionClass}
        onClick={() => returnFollowupToComposer(item)}
      >
        {t("chat.runtimeReturnToComposer")}
      </button>
      <button
        type="button"
        data-testid="queued-remove"
        aria-label={t("chat.runtimeRemoveFollowup")}
        onClick={() => discardFollowup(item)}
        className={iconClass}
      >
        <RiCloseLine className="size-3.5" aria-hidden />
      </button>
    </>
  )

  if (compact) {
    return (
      <div
        data-testid="queued-user-turn"
        data-queued-id={item.id}
        data-placement="dock"
        className={cx(
          "flex min-w-0 shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-border-button-default",
          "bg-background-secondary-default/60 py-0.5 pr-1 pl-3 text-caption-2-medium text-text-secondary"
        )}
      >
        {/* luna P2④：text-tertiary（#a1a1a1）只有 ~2.5:1；和说明行同一个灰（亮 7.49 / 暗 6.52）。 */}
        <span data-testid="queued-row-label" className={cx("shrink-0", QUEUE_MUTED_TEXT)}>
          {label}
        </span>
        <p className="min-w-0 flex-1 truncate text-caption-1-regular" title={preview}>
          {preview || queuedExtrasLabel(t, extraCount)}
        </p>
        {/* 有文字时预览只放得下文字：附件 / 引用数另起一个小签，不然单行里看不出这条还带着图。 */}
        {preview && extraCount > 0 ? (
          <span
            data-testid="queued-extras"
            title={queuedExtrasLabel(t, extraCount)}
            className="inline-flex shrink-0 items-center gap-0.5 text-text-tertiary"
          >
            <RiAttachment2 className="size-3" aria-hidden />
            <span aria-hidden>{extraCount}</span>
            <span className="sr-only">{queuedExtrasLabel(t, extraCount)}</span>
          </span>
        ) : null}
        <div className="flex shrink-0 items-center gap-0.5">{actions}</div>
      </div>
    )
  }

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
            {queuedExtrasLabel(t, extraCount)}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-caption-2-medium">
          <span data-testid="queued-row-label" className={QUEUE_MUTED_TEXT}>
            {label}
          </span>
          {actions}
        </div>
      </div>
    </Message>
  )
}

const actionBaseClass =
  "inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-accent-500/10"

const iconClass =
  "inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary disabled:cursor-default disabled:opacity-30"
