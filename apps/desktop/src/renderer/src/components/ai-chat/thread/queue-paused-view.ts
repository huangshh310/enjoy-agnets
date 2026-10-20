/**
 * E1 暂停说明行的纯判定：原因文案（英文 N=1 单数）、哪些按钮露出，以及「全部清空」的 toast + 撤回。
 */
import type { FollowupPausedReason } from "@renderer/hooks/followup-queue"
import { clearAllFollowups, undoClearFollowups } from "@renderer/hooks/runtime-interact/followup-pause-actions"
import { showAppToast, ARCHIVE_UNDO_TOAST_MS } from "@renderer/lib/app-toast"

type Translate = (path: string, vars?: Record<string, string | number>) => string

export const QUEUE_CLEAR_UNDO_MS = ARCHIVE_UNDO_TOAST_MS

export type QueuePausedView = {
  text: string
  showContinue: boolean
  showEditFirst: boolean
}

const REASON_KEY: Record<FollowupPausedReason, string> = {
  stopped: "chat.queuePausedStopped",
  error: "chat.queuePausedError",
  quota: "chat.queuePausedQuota"
}

export function queuePausedReasonText(t: Translate, reason: FollowupPausedReason, count: number, provider: string): string {
  const key = count === 1 ? `${REASON_KEY[reason]}One` : REASON_KEY[reason]
  return t(key, { n: count, provider })
}

export function queuePausedView(input: {
  reason: FollowupPausedReason
  count: number
  composerHasContent: boolean
  /** 失败卡上的「再发一次 / 再试一次」此刻露着（#136）。 */
  failureCardRetryShowing: boolean
  provider: string
  t: Translate
}): QueuePausedView {
  const reasonText = queuePausedReasonText(input.t, input.reason, input.count, input.provider)
  const resendFirst = input.reason !== "stopped" && input.failureCardRetryShowing
  return {
    text: resendFirst ? `${reasonText}${joiner(reasonText)}${input.t("chat.queuePausedResendFirst")}` : reasonText,
    showContinue: !resendFirst,
    showEditFirst: !resendFirst && !input.composerHasContent
  }
}

/** 中文句号后直接接；英文句子之间留一个空格。 */
function joiner(text: string): string {
  return /[。！？]$/.test(text) ? "" : " "
}

/** 「全部清空」：不弹确认，toast「已清空 N 条排队」，5 秒内可撤回。 */
export function clearQueuedWithUndo(
  sessionId: string | null | undefined,
  t: Translate,
  toast: typeof showAppToast = showAppToast
): void {
  const cleared = clearAllFollowups(sessionId)
  if (!cleared) return
  const n = cleared.items.length
  toast(n === 1 ? t("chat.queuePausedClearedOne") : t("chat.queuePausedCleared", { n }), {
    id: `queue-cleared-${cleared.sessionId}`,
    testId: "queue-cleared-toast",
    duration: QUEUE_CLEAR_UNDO_MS,
    action: { label: t("common.undo"), onClick: () => undoClearFollowups(cleared) }
  })
}
