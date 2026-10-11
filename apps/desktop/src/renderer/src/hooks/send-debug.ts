/**
 * 发送链路排查：e2e 里置 window.__enjoySendDebugOn = true 才记，环形保留最近 60 条。
 * 只为定位「Enter 被静默吞掉」，生产默认不记。
 */
type SendDebugWindow = { __enjoySendDebugOn?: boolean; __enjoySendDebug?: unknown[] }

export function traceSend(step: string, data?: Record<string, unknown>): void {
  if (typeof window === "undefined") return
  const w = window as unknown as SendDebugWindow
  if (!w.__enjoySendDebugOn) return
  const log = (w.__enjoySendDebug ??= [])
  log.push({ t: Math.round(performance.now()), step, ...data })
  if (log.length > 60) log.splice(0, log.length - 60)
}
