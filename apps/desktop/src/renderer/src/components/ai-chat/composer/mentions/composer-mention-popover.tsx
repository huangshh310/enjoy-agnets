/**
 * 把 @ / 面板挂到 document.body，避免被 Composer / BorderBeam 裁掉。
 * 默认在输入框上方；撞标题栏或上方不够时翻到下方并限高。
 */
import { cloneElement, isValidElement, useLayoutEffect, useState, type ReactElement, type ReactNode, type RefObject } from "react"
import { createPortal } from "react-dom"
import { placeMentionPopover, type MentionPopoverPlacement } from "./mention-popover-placement.ts"

type MentionChildProps = { maxHeight?: number }

export function ComposerMentionPopover({
  anchorRef,
  children
}: {
  anchorRef: RefObject<HTMLElement | null>
  children: ReactNode
}) {
  const [placed, setPlaced] = useState<MentionPopoverPlacement | null>(null)

  useLayoutEffect(() => {
    const node =
      (anchorRef.current?.closest("[data-frost=chip]") as HTMLElement | null) ?? anchorRef.current
    if (!node) return
    const update = () => {
      const box = node.getBoundingClientRect()
      setPlaced(
        placeMentionPopover(box, {
          width: window.innerWidth,
          height: window.innerHeight
        })
      )
    }
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

  if (!placed || typeof document === "undefined") return null

  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<MentionChildProps>, { maxHeight: placed.maxHeight })
    : children

  return createPortal(
    <div
      data-testid="composer-mention-popover"
      data-placement={placed.placement}
      style={{
        position: "fixed",
        left: placed.left,
        width: placed.width,
        top: placed.top,
        bottom: placed.bottom,
        zIndex: 80,
        maxHeight: placed.maxHeight
      }}
    >
      {child}
    </div>,
    document.body
  )
}
