/**
 * 节点 / 连线右键菜单，对齐 infinite-canvas CanvasNodeContextMenu。
 */
import { useEffect } from "react"
import { RiAddLine, RiDeleteBinLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import type { ContextMenuState } from "../lib/canvas.types"
import { useCanvasTheme } from "../stores/use-canvas-theme"

export function CanvasContextMenu({
  menu,
  onClose,
  onDuplicate,
  onDelete
}: {
  menu: ContextMenuState
  onClose: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const t = useT()
  const theme = useCanvasTheme()
  useEffect(() => {
    const close = () => onClose()
    window.addEventListener("pointerdown", close)
    return () => window.removeEventListener("pointerdown", close)
  }, [onClose])

  return (
    <div
      className="fixed z-[80] min-w-44 overflow-hidden rounded-xl border py-1 shadow-2xl"
      style={{ left: menu.x, top: menu.y, background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {menu.type === "node" ? (
        <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs" onClick={onDuplicate}>
          <RiAddLine className="size-4" />
          {t("pages.workflows.canvasDuplicate")}
        </button>
      ) : null}
      <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-400" onClick={onDelete}>
        <RiDeleteBinLine className="size-4" />
        {t("pages.workflows.canvasDelete")}
      </button>
    </div>
  )
}
