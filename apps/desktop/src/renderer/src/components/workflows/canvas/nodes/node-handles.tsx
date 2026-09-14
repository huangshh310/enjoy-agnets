/**
 * 节点端口与四角缩放柄。
 */
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
    <div
      className="absolute top-1/2 z-20 -translate-y-1/2 flex items-center justify-center pointer-events-auto"
      style={{
        [side]: -8,
        opacity: visible ? 1 : 0,
        transition: "opacity 150ms ease, transform 150ms ease",
        pointerEvents: visible ? "auto" : "none"
      }}
    >
      <button
        type="button"
        title={side === "left" ? "输入端口" : "输出端口"}
        className="group relative size-4 rounded-full border-2 border-white dark:border-zinc-900 bg-blue-500 shadow-md transition-transform hover:scale-125 active:scale-95"
        style={{
          boxShadow: "0 0 0 1px rgba(59,130,246,0.3), 0 2px 6px rgba(0,0,0,0.15)"
        }}
        onMouseDown={(event) => {
          event.stopPropagation()
          onMouseDown(event)
        }}
      >
        <span className="absolute inset-0 rounded-full bg-blue-400 opacity-0 group-hover:opacity-40 transition-opacity" />
      </button>
    </div>
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
      ? "-left-1.5 -top-1.5 cursor-nwse-resize"
      : corner === "top-right"
        ? "-right-1.5 -top-1.5 cursor-nesw-resize"
        : corner === "bottom-left"
          ? "-left-1.5 -bottom-1.5 cursor-nesw-resize"
          : "-right-1.5 -bottom-1.5 cursor-nwse-resize"

  return (
    <div
      className={`absolute z-30 size-3 rounded-[3px] border-[1.5px] border-blue-500 bg-white dark:bg-zinc-900 shadow-sm transition-transform hover:scale-125 active:scale-95 ${pos}`}
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.18)"
      }}
      onMouseDown={(event) => onMouseDown(event, corner)}
    />
  )
}
