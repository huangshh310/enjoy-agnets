/**
 * 节点端口与四角缩放柄。
 */
import { SELECTION_BLUE } from "../../lib/canvas-constants"

export type ResizeCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right"

export function ConnectionHandleDot({
  side,
  visible,
  onMouseDown
}: {
  side: "left" | "right"
  visible: boolean
  onMouseDown: (event: React.MouseEvent) => void
}) {
  return (
    <button
      type="button"
      className="absolute top-1/2 z-20 size-3.5 -translate-y-1/2 rounded-full border-2 shadow-sm"
      style={{
        [side]: -7,
        opacity: visible ? 1 : 0,
        background: SELECTION_BLUE,
        borderColor: "#fff"
      }}
      onMouseDown={(event) => {
        event.stopPropagation()
        onMouseDown(event)
      }}
    />
  )
}

export function ResizeHandle({
  corner,
  onMouseDown
}: {
  corner: ResizeCorner
  onMouseDown: (event: React.MouseEvent, corner: ResizeCorner) => void
}) {
  const pos =
    corner === "top-left"
      ? "left-0 top-0 cursor-nwse-resize"
      : corner === "top-right"
        ? "right-0 top-0 cursor-nesw-resize"
        : corner === "bottom-left"
          ? "bottom-0 left-0 cursor-nesw-resize"
          : "bottom-0 right-0 cursor-nwse-resize"
  return (
    <div
      className={`absolute z-20 size-2.5 rounded-[2px] ${pos}`}
      style={{ background: SELECTION_BLUE }}
      onMouseDown={(event) => onMouseDown(event, corner)}
    />
  )
}
