/**
 * 把 @ / 面板挂到 document.body，避免被 Composer / BorderBeam 裁掉。
 */
import { useLayoutEffect, useState, type ReactNode, type RefObject } from "react"
import { createPortal } from "react-dom"

export function ComposerMentionPopover({
  anchorRef,
  children
}: {
  anchorRef: RefObject<HTMLElement | null>
  children: ReactNode
}) {
  const [box, setBox] = useState<DOMRect | null>(null)

  useLayoutEffect(() => {
    const node =
      (anchorRef.current?.closest("[data-frost=chip]") as HTMLElement | null) ?? anchorRef.current
    if (!node) return
    const update = () => setBox(node.getBoundingClientRect())
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [anchorRef])

  if (!box || typeof document === "undefined") return null

  return createPortal(
    <div
      data-testid="composer-mention-popover"
      style={{
        position: "fixed",
        left: box.left + 10,
        width: Math.max(280, box.width - 20),
        bottom: Math.max(8, window.innerHeight - box.top + 8),
        zIndex: 80
      }}
    >
      {children}
    </div>,
    document.body
  )
}
