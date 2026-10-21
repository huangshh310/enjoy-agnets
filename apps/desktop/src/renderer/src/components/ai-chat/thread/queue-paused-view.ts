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
 * 比值按 WCAG 2 相对亮度算（行底是 bg-background-secondary-default 的实色）；回归测试见 followup-pause.behavior.test.ts「P2④ 对比度」。
 */
export const QUEUE_MUTED_TEXT = "text-neutral-600 dark:text-neutral-400"

/**
 * luna #163（10-21 定）：时间线泡的「排队中 / 已暂停」标签。泡整体 opacity-80（表示「还没发」，保留），
 * 亮色 neutral-600 只有 4.49，深一档 neutral-700 = 5.60；暗色 neutral-400 = 4.60 不变。紧凑行标签仍用 QUEUE_MUTED_TEXT。
 * 算法：前景、背景各按 80% 叠到页面底色后再算 WCAG 比值（同 followup-pause.behavior.test.ts 的 bubbleLabel）。
 */
export const QUEUE_BUBBLE_LABEL_TEXT = "text-neutral-700 dark:text-neutral-400"

/**
 * 排队行「马上发给它 / 退回输入框」链接 ≥ 4.5:1：五种强调色（蓝 / 绿 / 琥珀 / 紫 / 石板）、亮暗、经典和玻璃皮肤、常态和悬停
 * （悬停底色叠 accent-500/10）都要过线（luna #163 h163）。只用 accent-500/600 时绿、琥珀在亮色下不够，所以：
 * 紧凑行（bg-secondary/60）：亮 accent-800，悬停 accent-900；暗 accent-400，悬停 accent-300。
 * 时间线泡（整个泡 opacity-80，前景和背景都按 80% 叠到页面底色）：亮 accent-900，悬停 accent-950；暗 accent-300，悬停 accent-200。
 * 这些色阶在 theme.css 里按 data-accent 整条覆盖，换强调色会跟着变。回归测试见 followup-pause.behavior.test.ts「排队行链接对比度」「强调色整条 ramp」。
 */
export const QUEUE_LINK_DOCK = "text-accent-800 hover:text-accent-900 dark:text-accent-400 dark:hover:text-accent-300"
export const QUEUE_LINK_BUBBLE = "text-accent-900 hover:text-accent-950 dark:text-accent-300 dark:hover:text-accent-200"

export type QueuePausedView = {
  text: string
  showContinue: boolean
  showEditFirst: boolean
}

const REASON_KEY: Record<FollowupPausedReason, string> = {
  stopped: "chat.queuePausedStopped",
  engineSwitched: "chat.queuePausedEngineSwitched",
  held: "chat.queuePausedHeld",
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

/**
 * luna P1（m211）锁定：失败的那一条还没发出去（pendingFailed 非空：还在卡上 / 已写回输入框）时，暂停行停在「先发这一条」：
 * 不给「继续」、不给「改一下再发」，不管暂停原因是什么。
 * - "card"：失败卡上「再发一次 / 再试一次」露着（或用户句留在线程里）→「先发上面这条…」；
 * - "composer"：卡关了 / 换了模型 / 卡上没有重发按钮（密钥没通过），稿在输入框里 →「先发输入框里这条…」。
 * 出错 / 额度：发出去后排队的自己接着发（句子这么说）；停止 / 换助手 / held 不会自动接着发，
 * 句尾说完下一步「先发…这条，发出去后再点继续。」（luna 10-21），发出去后「继续」重新出现。
 * 用户把输入框清空（放弃）之后 pendingFailed 为 null，才回到「…点继续」并给「继续」。
 */
export function queuePausedView(input: {
  reason: FollowupPausedReason
  count: number
  composerHasContent: boolean
  /** 还没发出去的失败消息在哪（pending-failed-send 的 pendingFailedSendPlace）；没有为 null。 */
  pendingFailed: "card" | "composer" | null
  provider: ProviderFace
  t: Translate
}): QueuePausedView {
  const place = input.pendingFailed
  const fill = (key: string) =>
    fillProviderFace(input.t, pluralKey(key, input.count), input.provider, { varName: "provider", vars: { n: input.count } })
  let text: string
  if (place && input.reason === "quota") {
    // luna P2③：「继续」藏起来时额度句不能说「充值后点继续」，整句换成「充值后先发上面 / 输入框里这条…」。
    text = fill(place === "card" ? "chat.queuePausedQuotaResend" : "chat.queuePausedQuotaComposer")
  } else if (place) {
    const reasonText = queuePausedReasonText(input.t, input.reason, input.count, input.provider)
    const tailKey = isNeutralPause(input.reason)
      ? place === "card"
        ? "chat.queuePausedResendFirstHeld"
        : "chat.queuePausedComposerFirstHeld"
      : place === "card"
        ? "chat.queuePausedResendFirst"
        : "chat.queuePausedComposerFirst"
    text = `${reasonText}${joiner(reasonText)}${input.t(tailKey)}`
  } else {
    text = queuePausedReasonText(input.t, input.reason, input.count, input.provider)
  }
  return {
    text,
    showContinue: !place,
    showEditFirst: !place && !input.composerHasContent
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

/** 排队行「发」按钮：没在跑 → 立即发送；在跑 → 马上发给它；在跑但队列停着（暂停中来审批）→ 单独发这条，不和「已暂停」打架（mike P3）。 */
export function queuedSendNowKey(running: boolean, paused: boolean): string {
  if (!running) return "chat.runtimeSendNow"
  return paused ? "chat.runtimeSteerItemPaused" : "chat.runtimeSteerItem"
}

/** E1：窗口高 ≤600 且没点开时，暂停的排队区折成一行（放在纯 .ts 里，单测能直接测）。 */
export function pausedCollapsed(shortWindow: boolean, expanded: boolean): boolean {
  return shortWindow && !expanded
}
