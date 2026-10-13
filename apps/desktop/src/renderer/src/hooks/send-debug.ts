/**
 * 发送链路排查：dev 构建或 e2e 置 window.__enjoySendDebugOn = true 才记，环形保留最近 60 条。
 * 只记长度 / 状态 / error.name，不记正文。生产默认不记。
 */
type SendDebugWindow = { __enjoySendDebugOn?: boolean; __enjoySendDebug?: unknown[] }

function devBuild(): boolean {
  return (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true
}

export function traceSend(step: string, data?: Record<string, unknown>): void {
  if (typeof window === "undefined") return
  const w = window as unknown as SendDebugWindow
  if (!w.__enjoySendDebugOn && !devBuild()) return
  const log = (w.__enjoySendDebug ??= [])
  log.push({ t: Math.round(performance.now()), step, ...data })
  if (log.length > 60) log.splice(0, log.length - 60)
}
