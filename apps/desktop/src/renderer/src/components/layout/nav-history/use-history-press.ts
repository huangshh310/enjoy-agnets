/**
 * 短按走一步，按住 400ms 打开最近页面。松手落在按钮外也要收住。
 */
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react"
import { HISTORY_LONG_PRESS_MS } from "@renderer/hooks/nav-history/constants"

export function useHistoryPress(enabled: boolean, onHold: () => void, onTap: () => void) {
  const hold = useHold(onHold)
  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!enabled || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    hold.start()
  }
  const endPress = (event: ReactPointerEvent<HTMLButtonElement>) => {
    releasePointer(event.currentTarget, event.pointerId)
    hold.cancel()
  }
  const onClick = () => {
    if (hold.consume() || !enabled) return
    onTap()
  }
  return { onPointerDown, onPointerUp: endPress, onPointerCancel: endPress, onClick }
}

function useHold(onHold: () => void) {
  const timer = useRef<number | null>(null)
  const held = useRef(false)
  useEffect(() => () => {
    if (timer.current != null) window.clearTimeout(timer.current)
  }, [])
  const start = () => {
    held.current = false
    if (timer.current != null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      held.current = true
      onHold()
    }, HISTORY_LONG_PRESS_MS)
  }
  const cancel = () => {
    if (timer.current != null) window.clearTimeout(timer.current)
    timer.current = null
  }
  const consume = () => {
    const wasHeld = held.current
    held.current = false
    return wasHeld
  }
  return { start, cancel, consume }
}

function releasePointer(node: Element, pointerId: number) {
  if (node.hasPointerCapture(pointerId)) node.releasePointerCapture(pointerId)
}
