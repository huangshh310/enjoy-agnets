/**
 * 打回后给 Composer 换一句占位提示（只对当时那个会话生效，切会话自动失效）。
 */
import { useSyncExternalStore } from "react"

type Hint = { sessionId: string; text: string } | null

let hint: Hint = null
const listeners = new Set<() => void>()

export function setComposerPlaceholderHint(next: Hint): void {
  hint = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useComposerPlaceholderHint(sessionId: string | null): string | null {
  const current = useSyncExternalStore(subscribe, () => hint)
  return current && sessionId && current.sessionId === sessionId ? current.text : null
}
