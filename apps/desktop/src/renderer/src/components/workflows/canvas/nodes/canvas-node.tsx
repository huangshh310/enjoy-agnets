/**
 * 画布节点外壳：对齐 infinite-canvas CanvasNode（选中环、四角缩放、左右端口、标题）。
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { useT } from "@renderer/i18n"
import { SELECTION_BLUE } from "../../lib/canvas-constants"
import { CanvasNodeType, type CanvasNodeData, type Position } from "../../lib/canvas.types"
import { useCanvasTheme } from "../../stores/use-canvas-theme"
import { ConnectionHandleDot, ResizeHandle, type ResizeCorner } from "./node-handles"
import { NodeContents } from "./node-contents"

export function CanvasNode({
  data,
  scale,
  isSelected,
  isRelated,
  isFocusRelated,
  isConnectionTarget,
  isConnecting,
  showPanel,
  onMouseDown,
  onSelectCapture,
  onHoverStart,
  onHoverEnd,
  onConnectStart,
  onResizeStart,
  onResize,
  onResizeEnd,
  onContentChange,
  onTitleChange,
  onRetry,
  onViewImage,
  onContextMenu,
  renderPanel
}: {
  data: CanvasNodeData
  scale: number
  isSelected: boolean
  isRelated: boolean
  isFocusRelated: boolean
  isConnectionTarget: boolean
  isConnecting: boolean
  showPanel: boolean
  onMouseDown: (event: React.MouseEvent, nodeId: string) => void
  onSelectCapture?: (event: React.MouseEvent, nodeId: string) => void
  onHoverStart: (nodeId: string) => void
  onHoverEnd: (nodeId: string) => void
  onConnectStart: (event: React.MouseEvent, nodeId: string, handleType: "source" | "target") => void
  onResizeStart: (nodeId: string) => void
  onResize: (nodeId: string, width: number, height: number, position?: Position) => void
  onResizeEnd: (nodeId: string) => void
  onContentChange: (nodeId: string, content: string) => void
  onTitleChange: (nodeId: string, title: string) => void
  onRetry?: (node: CanvasNodeData) => void
  onViewImage?: (node: CanvasNodeData) => void
  onContextMenu: (event: React.MouseEvent, nodeId: string) => void
  renderPanel?: (node: CanvasNodeData) => React.ReactNode
}) {
  const t = useT()
  const theme = useCanvasTheme()
  const [hovered, setHovered] = useState(false)
  const [isEditingContent, setIsEditingContent] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(data.title || "")
  const titleInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isGroup = data.type === CanvasNodeType.Group
  const hasImageContent = data.type === CanvasNodeType.Image && Boolean(data.metadata?.content)
  const hasVideoContent = data.type === CanvasNodeType.Video && Boolean(data.metadata?.content)
  const isActive = isConnectionTarget || isSelected || isFocusRelated
  const imageBorderColor = isActive ? SELECTION_BLUE : isRelated ? theme.node.muted : "transparent"

  useEffect(() => {
    setTitleDraft(data.title || "")
  }, [data.title])

  const finishTitleEditing = useCallback(() => {
    const title = titleDraft.trim() || data.title || t("pages.workflows.canvasUntitled")
    setTitleDraft(title)
    setIsEditingTitle(false)
    if (title !== data.title) onTitleChange(data.id, title)
  }, [data.id, data.title, onTitleChange, t, titleDraft])

  const resizeRef = useRef({
    isResizing: false,
    corner: "bottom-right" as ResizeCorner,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    startWidth: 0,
    startHeight: 0,
    keepRatio: false,
    ratio: 1
  })

  const handleResizeMove = useCallback(
    (event: MouseEvent) => {
      if (!resizeRef.current.isResizing) return
      const dx = (event.clientX - resizeRef.current.startX) / scale
      const dy = (event.clientY - resizeRef.current.startY) / scale
      const minWidth = 220
      const minHeight = 160
      const startRight = resizeRef.current.startLeft + resizeRef.current.startWidth
      const startBottom = resizeRef.current.startTop + resizeRef.current.startHeight
      const fromLeft = resizeRef.current.corner.includes("left")
      const fromTop = resizeRef.current.corner.includes("top")
      let width = Math.max(minWidth, resizeRef.current.startWidth + (fromLeft ? -dx : dx))
      let height = Math.max(minHeight, resizeRef.current.startHeight + (fromTop ? -dy : dy))
      if (resizeRef.current.keepRatio) {
        const ratio = resizeRef.current.ratio
        if (Math.abs(dx) >= Math.abs(dy)) height = width / ratio
        else width = height * ratio
      }
      onResize(data.id, width, height, {
        x: fromLeft ? startRight - width : resizeRef.current.startLeft,
        y: fromTop ? startBottom - height : resizeRef.current.startTop
      })
    },
    [data.id, onResize, scale]
  )

  const handleResizeUp = useCallback(() => {
    resizeRef.current.isResizing = false
    window.removeEventListener("mousemove", handleResizeMove)
    window.removeEventListener("mouseup", handleResizeUp)
    onResizeEnd(data.id)
  }, [data.id, handleResizeMove, onResizeEnd])

  function handleResizeMouseDown(event: React.MouseEvent, corner: ResizeCorner) {
    event.stopPropagation()
    event.preventDefault()
    onResizeStart(data.id)
    resizeRef.current = {
      isResizing: true,
      corner,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: data.position.x,
      startTop: data.position.y,
      startWidth: data.width,
      startHeight: data.height,
      keepRatio: (data.type === CanvasNodeType.Image && !data.metadata?.freeResize) || data.type === CanvasNodeType.Video,
      ratio: (data.metadata?.naturalWidth || data.width) / (data.metadata?.naturalHeight || data.height || 1)
    }
    window.addEventListener("mousemove", handleResizeMove)
    window.addEventListener("mouseup", handleResizeUp)
  }

  return (
    <div
      data-node-id={data.id}
      className={`node-element absolute flex select-none flex-col ${isGroup ? "z-[5]" : isSelected ? "z-50" : "z-10"}`}
      style={{ transform: `translate(${data.position.x}px, ${data.position.y}px)`, width: data.width, height: data.height }}
      onMouseEnter={() => {
        setHovered(true)
        onHoverStart(data.id)
      }}
      onMouseLeave={() => {
        setHovered(false)
        onHoverEnd(data.id)
      }}
      onMouseDownCapture={(event) => onSelectCapture?.(event, data.id)}
      onContextMenu={(event) => onContextMenu(event, data.id)}
    >
      {(isSelected || hovered || isEditingTitle) && (
        <div className="absolute left-3 top-[-28px] z-[65] max-w-[calc(100%-24px)]" onMouseDown={(e) => e.stopPropagation()}>
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              maxLength={64}
              className="h-6 max-w-full border-0 border-b border-dashed bg-transparent px-0 text-left text-xs font-medium outline-none"
              style={{ borderColor: theme.node.muted, color: theme.node.text }}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={finishTitleEditing}
              onKeyDown={(e) => {
                if (e.key === "Enter") finishTitleEditing()
                if (e.key === "Escape") {
                  setTitleDraft(data.title || "")
                  setIsEditingTitle(false)
                }
              }}
            />
          ) : (
            <button
              type="button"
              className="block max-w-full truncate border-b border-dashed border-transparent px-0 py-0.5 text-left text-xs font-medium opacity-75 hover:border-current hover:opacity-100"
              style={{ color: theme.node.text }}
              onDoubleClick={(e) => {
                e.stopPropagation()
                setIsEditingTitle(true)
              }}
            >
              {data.title || t("pages.workflows.canvasUntitled")}
            </button>
          )}
        </div>
      )}

      <div
        className="relative h-full w-full overflow-visible rounded-3xl border-2"
        style={{
          background: isGroup ? "transparent" : hasImageContent || hasVideoContent ? "transparent" : theme.node.fill,
          borderColor: isGroup
            ? isActive
              ? SELECTION_BLUE
              : theme.node.stroke
            : hasImageContent
              ? imageBorderColor
              : isActive
                ? SELECTION_BLUE
                : isRelated
                  ? theme.node.muted
                  : theme.node.stroke,
          borderStyle: isGroup ? "dashed" : "solid",
          boxShadow: isActive ? `0 0 0 1px ${SELECTION_BLUE}55` : isRelated ? `0 0 0 1px ${theme.node.muted}55` : undefined
        }}
        onMouseDown={(event) => onMouseDown(event, data.id)}
        onDoubleClick={(event) => {
          if (data.type === CanvasNodeType.Image && hasImageContent) {
            event.stopPropagation()
            onViewImage?.(data)
            return
          }
          if (data.type !== CanvasNodeType.Text) return
          event.stopPropagation()
          setIsEditingContent(true)
        }}
      >
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[inherit]">
          <NodeContents
            node={data}
            theme={theme}
            isEditingContent={isEditingContent}
            textareaRef={textareaRef}
            onContentChange={onContentChange}
            onStopEditing={() => setIsEditingContent(false)}
            onRetry={onRetry}
          />
        </div>
        {(["top-left", "top-right", "bottom-left", "bottom-right"] as ResizeCorner[]).map((corner) => (
          <ResizeHandle key={corner} corner={corner} onMouseDown={handleResizeMouseDown} />
        ))}
      </div>

      {!isGroup ? (
        <ConnectionHandleDot side="left" visible={hovered || isSelected || isConnecting} onMouseDown={(e) => onConnectStart(e, data.id, "target")} />
      ) : null}
      {!isGroup && data.type !== CanvasNodeType.Config ? (
        <ConnectionHandleDot side="right" visible={hovered || isSelected || isConnecting} onMouseDown={(e) => onConnectStart(e, data.id, "source")} />
      ) : null}

      {showPanel && !isGroup && renderPanel ? (
        <div className="absolute left-1/2 top-full z-[70] w-[520px] -translate-x-1/2 pt-4">{renderPanel(data)}</div>
      ) : null}
    </div>
  )
}
