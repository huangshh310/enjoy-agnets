/**
 * E1 暂停说明行（luna 定稿）：排队区最上面一行，与排队行同宽、同容器，紧贴输入框上方。
 * 左：暂停图标 + 原因；右：「全部清空 · 改一下再发 · 继续」（继续是主按钮，最右）。
 * - 用户停止：整行中性灰；出错 / 额度用完：图标和文字琥珀色。无标题、不用红卡。
 * - 「改一下再发」：输入框已有内容时隐藏（不置灰）。
 * - 与 #136：出错 / 额度后失败卡上「再发一次 / 再试一次」显示时，隐藏「继续」「改一下再发」，原因后加
 *   「先发上面这条，发出去后排队的会接着发。」——重发成功后队列自己接着发（followup-pause）。
 */
import { RiPauseCircleLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { FollowupPausedReason } from "@renderer/hooks/followup-queue"
import { useComposerHasDraft } from "@renderer/hooks/runtime-interact/use-composer-has-draft"
import { useRetryKeptDraftAvailable } from "@renderer/hooks/retry-kept-draft"
import { useT } from "@renderer/i18n"
import { useSendFailureProviderName } from "@renderer/hooks/use-send-failure-provider-name"
import { isNeutralPause } from "@renderer/hooks/followup-pause"
import { classifyThreadError } from "@renderer/lib/usage/classify-thread-error"
import { useChatStore } from "@renderer/stores/chat-store"
import { clearQueuedWithUndo, queuePausedView, QUEUE_MUTED_TEXT } from "./queue-paused-view"
import { continueFollowups, editFirstFollowup } from "@renderer/hooks/runtime-interact/followup-pause-actions"

export function QueuePausedIcon({ reason }: { reason: FollowupPausedReason }) {
  return (
    <RiPauseCircleLine
      aria-hidden
      className={cx("size-3.5 shrink-0", isNeutralPause(reason) ? "text-text-tertiary" : "text-status-yellow-text")}
    />
  )
}

export function QueuePausedRow({ reason, count }: { reason: FollowupPausedReason; count: number }) {
  const t = useT()
  const sessionId = useChatStore((state) => state.sessionId)
  const composer = useChatStore((state) => state.composer)
  const error = useChatStore((state) => state.error)
  const composerHasContent = useComposerHasDraft(composer)
  const retryAvailable = useRetryKeptDraftAvailable()
  // 和失败卡同一个称呼（luna P2 锁定链）：ACP / CLI 引擎说引擎名；Enjoy 本地说品牌名 → 端点主机名 → 「模型服务」，从不说密钥档案名。
  const provider = useSendFailureProviderName()
  const view = queuePausedView({
    reason,
    count,
    composerHasContent,
    failureCardRetryShowing: retryAvailable && failureCardOffersRetry(error),
    provider,
    t
  })
  return (
    <div
      data-testid="queue-paused-row"
      data-reason={reason}
      className={cx(
        "flex min-w-0 shrink-0 items-center gap-1.5 rounded-xl border border-border-button-default",
        "bg-background-secondary-default py-1 pr-1 pl-3 text-caption-2-medium"
      )}
    >
      <QueuePausedIcon reason={reason} />
      <p
        data-testid="queue-paused-reason"
        className={cx(
          "min-w-0 flex-1 text-caption-1-regular",
          isNeutralPause(reason) ? QUEUE_MUTED_TEXT : "text-status-yellow-text"
        )}
      >
        {view.text}
      </p>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          data-testid="queue-paused-clear"
          className={secondaryClass}
          onClick={() => clearQueuedWithUndo(sessionId, t)}
        >
          {t("chat.queuePausedClearAll")}
        </button>
        {view.showEditFirst ? (
          <button
            type="button"
            data-testid="queue-paused-edit-first"
            className={secondaryClass}
            onClick={() => editFirstFollowup(sessionId)}
          >
            {t("chat.queuePausedEditFirst")}
          </button>
        ) : null}
        {view.showContinue ? (
          <button
            type="button"
            data-testid="queue-paused-continue"
            className={primaryClass}
            onClick={() => continueFollowups(sessionId)}
          >
            {t("chat.queuePausedContinue")}
          </button>
        ) : null}
      </div>
    </div>
  )
}

/** 带「再发一次 / 再试一次」的那几张首字前失败卡（#136：连不上 / 拒绝 / 额度）。 */
function failureCardOffersRetry(error: string | null): boolean {
  if (!error) return false
  const kind = classifyThreadError(error)
  return kind === "provider_unreachable" || kind === "provider_forbidden" || kind === "provider_billing"
}

const secondaryClass = `inline-flex shrink-0 cursor-pointer items-center rounded-md px-1.5 py-0.5 ${QUEUE_MUTED_TEXT} hover:bg-background-secondary-hover hover:text-text-primary`

/** 主按钮 token：默认 accent-700 白字（琥珀最低 5.05）、悬停 800；琥珀 ink 变体是 500 底墨色字。600 在绿 / 琥珀只有 3.77 / 3.19。 */
const primaryClass =
  "inline-flex shrink-0 cursor-pointer items-center rounded-md bg-cta px-2 py-0.5 text-cta-foreground hover:bg-cta-hover"
