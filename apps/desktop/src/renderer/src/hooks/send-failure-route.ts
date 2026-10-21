/**
 * luna P2-1：按会话记下「上一轮失败实际走的引擎 / 档案」（main 在 run.error 上带 runtimeId / providerId）。
 * 失败卡的称呼和「改密钥」去哪先认这一笔，不再按默认路线猜（默认路线不是 Enjoy 本地时会退到
 * 列表第一份带钥档案——OpenAI 那一轮却说「My Gateway」、Amp 的改密钥打开 My Gateway）。
 * 新一发过了发送闸（放行或被闸拦下）就清掉：那时卡说的是「这一发要用的」，回落当前档案（和 main 开跑同一挑法）。
 * 纯模块，测试直接调。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"

export type SendFailureRoute = { runtimeId: string; providerId?: string }

let routes: ReadonlyMap<string, SendFailureRoute> = new Map()
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

/** run.error 带了 runtimeId 才记；旧事件不带就不动（回落当前档案）。 */
export function noteSendFailureRouteFromEvent(sessionId: string | null | undefined, event: StreamEvent): void {
  if (!sessionId || event.type !== "run.error" || !event.runtimeId) return
  const next = new Map(routes)
  next.set(sessionId, event.providerId ? { runtimeId: event.runtimeId, providerId: event.providerId } : { runtimeId: event.runtimeId })
  routes = next
  emit()
}

export function clearSendFailureRoute(sessionId: string | null | undefined): void {
  if (!sessionId || !routes.has(sessionId)) return
  const next = new Map(routes)
  next.delete(sessionId)
  routes = next
  emit()
}

export function sendFailureRouteFor(sessionId: string | null | undefined): SendFailureRoute | null {
  return sessionId ? (routes.get(sessionId) ?? null) : null
}

export function getSendFailureRoutes(): ReadonlyMap<string, SendFailureRoute> {
  return routes
}

export function subscribeSendFailureRoutes(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** 测试用。 */
export function resetSendFailureRoutesForTest(): void {
  routes = new Map()
  emit()
}
