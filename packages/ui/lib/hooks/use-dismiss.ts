"use client"

/**
 * Escape 或外部 pointerdown 关闭浮层。onDismiss 须稳定（useCallback）。
 */
import { type RefObject, useEffect } from "react"

export function useDismiss(
  open: boolean,
  onDismiss: () => void,
  ref: RefObject<HTMLElement | null> | null
) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss()
    }
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target || ref?.current?.contains(target)) return
      onDismiss()
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("pointerdown", onPointer, true)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("pointerdown", onPointer, true)
    }
  }, [open, onDismiss, ref])
}
