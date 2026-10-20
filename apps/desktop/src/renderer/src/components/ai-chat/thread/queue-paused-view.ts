/**
 * E1 暂停说明行的纯判定：原因文案（英文 N=1 单数）、哪些按钮露出，以及「全部清空」的 toast + 撤回。
 */
import type { FollowupPausedReason } from "@renderer/hooks/followup-queue"
import { isNeutralPause } from "@renderer/hooks/followup-pause"
import { clearAllFollowups, undoClearFollowups } from "@renderer/hooks/runtime-interact/followup-pause-actions"
import { showAppToast, ARCHIVE_UNDO_TOAST_MS } from "@renderer/lib/app-toast"
import { fillProviderFace, type ProviderFace } from "@renderer/lib/provider-face"

type Translate = (path: string, vars?: Record<string, string | number>) => string

export const QUEUE_CLEAR_UNDO_MS = ARCHIVE_UNDO_TOAST_MS

/**
 * luna P2④ 对比度 ≥ 4.5:1（亮 / 暗都要）。text-text-secondary（neutral-500）在 bg-background-secondary-default 上
 * 亮 4.43 / 暗 3.78 不够，语义 token 里没有亮暗都过线的次要灰，所以用色板 token：
 * neutral-600 on #f7f7f7 = 7.29（亮），neutral-400 on #171717 = 6.94（暗）。说明行灰字、「全部清空」「改一下再发」、排队行「排队中 / 已暂停」都用它。
 * 算法和全表见 kai-e1.md。
 */
export const QUEUE_MUTED_TEXT = "text-neutral-600 dark:text-neutral-400"

/**
 * luna #163（10-21）：排队行「马上发给它 / 退回输入框」链接 ≥ 4.5:1，亮暗、常态和悬停都要（悬停底色 accent-500/10）。
 * 紧凑行（bg-secondary/60）：亮 accent-600 4.90–5.03，悬停 accent-700 5.70–5.84；
 *   暗 accent-600 只有 3.21–3.48，取最近能过的 accent-400 5.38–5.82，悬停往对比度高的方向走一档 accent-300 8.30–9.05。
 * 时间线泡（整个泡 opacity-80）：accent-600 亮 3.66 / accent-400 暗 3.85 都不够，取最近能过的：
 *   亮 accent-800 5.29，悬停 accent-900 5.27；暗 accent-300 6.32，悬停 accent-200 7.25。
 * 脚本 /workspace/kai-e1-contrast/links.py、links2.py；全表见 kai-e1.md。
 */
export const QUEUE_LINK_DOCK = "text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
export const QUEUE_LINK_BUBBLE = "text-accent-800 hover:text-accent-900 dark:text-accent-300 dark:hover:text-accent-200"

export type QueuePausedView = {
  text: string
  showContinue: boolean
  showEditFirst: boolean
}

const REASON_KEY: Record<FollowupPausedReason, string> = {
  stopped: "chat.queuePausedStopped",
  engineSwitched: "chat.queuePausedEngineSwitched",
  error: "chat.queuePausedError",
  quota: "chat.queuePausedQuota"
}

/** 一条用 …One（英文单数），其余用复数句（项目里的复数约定：同一个 key 加 One 后缀）。 */
function pluralKey(key: string, count: number): string {
  return count === 1 ? `${key}One` : key
}

/**
 * 原因文案。{provider} 走 luna 锁定链（provider-face：品牌名 → 端点主机名 → 「模型服务」，句首大写），
 * 从不说密钥档案名——和失败卡同一个 useSendFailureProviderName。
 */
export function queuePausedReasonText(
  t: Translate,
  reason: FollowupPausedReason,
  count: number,
  provider: ProviderFace
): string {
  return fillProviderFace(t, pluralKey(REASON_KEY[reason], count), provider, { varName: "provider", vars: { n: count } })
}

export function queuePausedView(input: {
  reason: FollowupPausedReason
  count: number
  composerHasContent: boolean
  /** 失败卡上的「再发一次 / 再试一次」此刻露着（#136）。 */
  failureCardRetryShowing: boolean
  provider: ProviderFace
  t: Translate
}): QueuePausedView {
  const resendFirst = !isNeutralPause(input.reason) && input.failureCardRetryShowing
  let text: string
  if (resendFirst && input.reason === "quota") {
    // luna P2③：失败卡露着时「继续」是藏起来的，额度句不能再说「充值后点继续」，整句换成「充值后先发上面这条…」。
    text = fillProviderFace(input.t, pluralKey("chat.queuePausedQuotaResend", input.count), input.provider, {
      varName: "provider",
      vars: { n: input.count }
    })
  } else {
    const reasonText = queuePausedReasonText(input.t, input.reason, input.count, input.provider)
    text = resendFirst ? `${reasonText}${joiner(reasonText)}${input.t("chat.queuePausedResendFirst")}` : reasonText
  }
  return {
    text,
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

/** 排队行的标签：队列停着说「已暂停」，否则「排队中」（luna P3a：审批卡在、说明行让位时也不能说「排队中」）。 */
export function queuedRowLabelKey(paused: boolean): string {
  return paused ? "chat.queuePausedLabel" : "chat.runtimeQueuedBubble"
}

/** E1：窗口高 ≤600 且没点开时，暂停的排队区折成一行（放在纯 .ts 里，单测能直接测）。 */
export function pausedCollapsed(shortWindow: boolean, expanded: boolean): boolean {
  return shortWindow && !expanded
}
