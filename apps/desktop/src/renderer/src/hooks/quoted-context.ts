/**
 * Composer 待发送引用。发送或 idle 点 Chip 时 take 走并拼进 Prompt 前部。
 */
import type { QuotedContext } from "@enjoy-agents/ipc-contract"

export type { QuotedContext }

let pending: QuotedContext[] = []
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

export function listQuotedContexts(): QuotedContext[] {
  return pending
}

export function addQuotedContext(quote: QuotedContext) {
  pending = pending.filter((item) => item.id !== quote.id)
  pending.push(quote)
  notify()
}

export function removeQuotedContext(id: string) {
  pending = pending.filter((item) => item.id !== id)
  notify()
}

export function takeQuotedContexts(): QuotedContext[] {
  const taken = pending
  pending = []
  notify()
  return taken
}

/** 编辑排队项时整表替换，避免和当前草稿 Chip 叠在一起。 */
export function setQuotedContexts(quotes: QuotedContext[]) {
  pending = [...quotes]
  notify()
}

export function subscribeQuotedContexts(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
