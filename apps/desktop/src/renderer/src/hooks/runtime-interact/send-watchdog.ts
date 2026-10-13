/**
 * 首发看门狗：Enter 已接下，但 ~3s 内既没发出 agent.run、也没出提示，就判失败：
 * 出「发送失败，已还原」并把 Enter 那一刻的原文留在框里。永远不许静默吞掉。
 * 创建窗还开着时是在合法排队（排队自带 15s 超时提示），不计时；有真 run 在跑等它落下时放宽到 8s。
 */
export type SendWatchdogProbe = {
  /** 已有提示（error / notice）挂着。 */
  noticeShown: () => boolean
  createPending: () => boolean
  /** 有别的真 run 在跑（排队首发在等它落下）。 */
  otherRunActive: () => boolean
  /** 判失败：还稿 + 出提示。 */
  fail: (text: string) => void
}

/**
 * 每次 Enter 一个句柄（不再是模块级单例）：发送链路把它一路传下去，
 * 发出 / 作废 / 暂停计时都只作用于这一次。
 */
export type SendAttempt = {
  text: string
  launched: boolean
  cancelled: boolean
  done: boolean
  /** 合法的长等待（如 /compact 压缩）期间不计时。 */
  paused: boolean
}

export const SEND_WATCHDOG_MS = 3_000
const OTHER_RUN_GRACE_MS = 8_000
const TICK_MS = 250

export function armSendWatchdog(
  text: string,
  probe: SendWatchdogProbe,
  timers: { now: () => number; every: (fn: () => void, ms: number) => () => void } = {
    now: () => Date.now(),
    every: (fn, ms) => {
      const id = setInterval(fn, ms)
      return () => clearInterval(id)
    }
  }
): SendAttempt {
  const attempt: SendAttempt = { text, launched: false, cancelled: false, done: false, paused: false }
  let waited = 0
  let last = timers.now()
  const stop = timers.every(() => {
    const now = timers.now()
    const step = now - last
    last = now
    if (attempt.done || attempt.launched) return stop()
    if (probe.noticeShown()) {
      attempt.done = true
      return stop()
    }
    // 创建窗内是合法排队，不计时。
    if (probe.createPending() || attempt.paused) return
    waited += step
    const limit = probe.otherRunActive() ? OTHER_RUN_GRACE_MS : SEND_WATCHDOG_MS
    if (waited < limit) return
    attempt.cancelled = true
    attempt.done = true
    stop()
    probe.fail(attempt.text)
  }, TICK_MS)
  return attempt
}

/** agent.run / 媒体生成已发出：看门狗收手。 */
export function markSendLaunched(attempt: SendAttempt | undefined): void {
  if (attempt) attempt.launched = true
}

/** 看门狗已判失败并还稿：迟到的发送不得再发出，也不得再动输入框 / 附件 / Chip。 */
export function sendAttemptCancelled(attempt: SendAttempt | undefined): boolean {
  return attempt?.cancelled === true
}

/** 合法长等待期间暂停计时（等完恢复）。 */
export async function pauseSendWatchdog<T>(attempt: SendAttempt | undefined, wait: () => Promise<T>): Promise<T> {
  if (!attempt) return wait()
  attempt.paused = true
  try {
    return await wait()
  } finally {
    attempt.paused = false
  }
}
