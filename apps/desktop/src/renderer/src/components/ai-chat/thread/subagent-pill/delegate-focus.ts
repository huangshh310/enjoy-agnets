/**
 * 药丸点某一行后，思考树展开并滚到对应派工。
 */
import { useEffect } from "react"
import { useSyncExternalStore } from "react"

type Focus = { id: string; nonce: number }

let focus: Focus = { id: "", nonce: 0 }
const listeners = new Set<() => void>()

export function focusDelegate(id: string): void {
  focus = { id, nonce: focus.nonce + 1 }
  for (const listener of listeners) listener()
}

export function useDelegateFocus(): Focus {
  return useSyncExternalStore(subscribe, () => focus, () => focus)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** 命中的思考树展开。setOpen 用 useState 的 setter，引用稳定。 */
export function useOpenTraceForFocus(
  tools: Array<{ id: string }>,
  setOpen: (open: boolean) => void
): void {
  const current = useDelegateFocus()
  useEffect(() => {
    if (!current.id || !tools.some((tool) => tool.id === current.id)) return
    setOpen(true)
  }, [current.id, current.nonce, setOpen, tools])
}

/** 命中的派工行展开并滚进视口。 */
export function useExpandFocusedDelegate(id: string, expand: (open: boolean) => void): void {
  const current = useDelegateFocus()
  useEffect(() => {
    if (current.id !== id) return
    expand(true)
    const handle = window.setTimeout(() => {
      document.querySelector(`[data-delegate-id="${cssEscape(id)}"]`)?.scrollIntoView({ block: "center" })
    }, 320)
    return () => window.clearTimeout(handle)
  }, [current.id, current.nonce, expand, id])
}

function cssEscape(value: string): string {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/"/g, "")
}
