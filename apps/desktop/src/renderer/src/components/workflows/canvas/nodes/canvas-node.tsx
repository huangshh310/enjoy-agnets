import { useCallback, useEffect, useRef, useState } from "react"
import {
  RiCheckLine,
  RiCloseLine,
  RiFileTextLine,
  RiImageLine,
  RiLoader4Line,
  RiMusic2Line,
  RiPlayCircleLine,
  RiSettings3Line,
  RiShieldCheckLine,
  RiStackLine
} from "@remixicon/react"
import type { WorkflowStatus } from "@enjoy-agents/ipc-contract"
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
  stepStatus,
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
  stepStatus?: WorkflowStatus
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
  const isActive = isConnectionTarget || isSelected || isFocusRelated

  useEffect(() => {
    setTitleDraft(data.title || "")
  }, [data.title])

  const finishTitleEditing = useCallback(() => {
    const title = titleDraft.trim() || data.title || getDefaultTitle(data.type, t)
    setTitleDraft(title)
    setIsEditingTitle(false)
    if (title !== data.title) onTitleChange(data.id, title)
  }, [data.id, data.title, data.type, onTitleChange, t, titleDraft])

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
      className={`node-element absolute flex select-none flex-col transition-shadow ${isGroup ? "z-[5]" : isSelected ? "z-50" : "z-10"}`}
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
      <div
        className={`relative flex h-full w-full flex-col overflow-hidden rounded-2xl border transition-shadow duration-150 ${
          isGroup
            ? "border-dashed bg-transparent"
            : "shadow-sm"
        }`}
        style={{
          background: isGroup ? "transparent" : theme.node.fill,
          borderColor: isGroup
            ? isActive
              ? SELECTION_BLUE
              : theme.node.stroke
            : isActive
              ? SELECTION_BLUE
              : isRelated
                ? `${SELECTION_BLUE}88`
                : theme.node.stroke,
          boxShadow: stepStatus === "running"
            ? "0 0 0 2px #3b82f6, 0 0 24px rgba(59,130,246,0.25)"
            : stepStatus === "waiting_review"
              ? "0 0 0 2px #f59e0b, 0 0 24px rgba(245,158,11,0.25)"
              : isActive
                ? `0 0 0 1.5px ${SELECTION_BLUE}, 0 8px 24px rgba(59,130,246,0.12)`
                : isRelated
                  ? `0 0 0 1px ${SELECTION_BLUE}44, 0 4px 12px rgba(0,0,0,0.06)`
                  : "0 1px 3px rgba(0,0,0,0.05)"
        }}
        onMouseDown={(event) => onMouseDown(event, data.id)}
        onDoubleClick={(event) => {
          if (data.type === CanvasNodeType.Image && data.metadata?.content) {
            event.stopPropagation()
            onViewImage?.(data)
            return
          }
          if (data.type !== CanvasNodeType.Text) return
          event.stopPropagation()
          setIsEditingContent(true)
        }}
      >
        {!isGroup && (
          <div
            className="flex h-9 shrink-0 cursor-grab items-center justify-between border-b px-3 text-xs active:cursor-grabbing"
            style={{
              background: theme.node.headerBg,
              borderColor: theme.node.stroke
            }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <NodeIcon type={data.type} className="size-3.5 shrink-0 opacity-70" />
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  autoFocus
                  value={titleDraft}
                  maxLength={48}
                  className="h-5 w-full rounded bg-transparent px-1 font-medium outline-none ring-1 ring-blue-500"
                  style={{ color: theme.node.text }}
                  onMouseDown={(e) => e.stopPropagation()}
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
                <span
                  className="cursor-text truncate font-medium hover:underline"
                  style={{ color: theme.node.text }}
                  title="双击重命名"
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    setIsEditingTitle(true)
                  }}
                >
                  {data.title || getDefaultTitle(data.type, t)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {stepStatus === "running" && (
                <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 animate-pulse">
                  <RiLoader4Line className="size-3 animate-spin" />
                  <span>执行中</span>
                </span>
              )}
              {stepStatus === "waiting_review" && (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  <RiShieldCheckLine className="size-3" />
                  <span>待审批</span>
                </span>
              )}
              {stepStatus === "completed" && (
                <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  <RiCheckLine className="size-3" />
                  <span>完成</span>
                </span>
              )}
              {stepStatus === "failed" && (
                <span className="flex items-center gap-0.5 rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                  <RiCloseLine className="size-3" />
                  <span>失败</span>
                </span>
              )}

              {!stepStatus && data.metadata?.status === "loading" && (
                <span className="size-2 animate-ping rounded-full bg-blue-500" />
              )}
              {!stepStatus && data.metadata?.status === "error" && (
                <span className="size-2 rounded-full bg-rose-500" title={data.metadata?.errorDetails} />
              )}
              <span className="text-[10px] uppercase font-mono opacity-40">
                {getNodeTypeLabel(data.type)}
              </span>
            </div>
          </div>
        )}

        <div className="relative flex flex-1 min-h-0 w-full items-center justify-center overflow-hidden">
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

        {isSelected && !isGroup && (
          <>
            {(["top-left", "top-right", "bottom-left", "bottom-right"] as ResizeCorner[]).map((corner) => (
              <ResizeHandle key={corner} corner={corner} onMouseDown={handleResizeMouseDown} />
            ))}
          </>
        )}
      </div>

      {!isGroup ? (
        <ConnectionHandleDot
          side="left"
          visible={hovered || isSelected || isConnecting}
          onMouseDown={(e) => onConnectStart(e, data.id, "target")}
        />
      ) : null}
      {!isGroup && data.type !== CanvasNodeType.Config ? (
        <ConnectionHandleDot
          side="right"
          visible={hovered || isSelected || isConnecting}
          onMouseDown={(e) => onConnectStart(e, data.id, "source")}
        />
      ) : null}

      {showPanel && !isGroup && renderPanel ? (
        <div className="absolute left-1/2 top-full z-[70] w-[520px] -translate-x-1/2 pt-3">{renderPanel(data)}</div>
      ) : null}
    </div>
  )
}

function NodeIcon({ type, className }: { type: string; className?: string }) {
  if (type === CanvasNodeType.Text) return <RiFileTextLine className={className} />
  if (type === CanvasNodeType.Image) return <RiImageLine className={className} />
  if (type === CanvasNodeType.Video) return <RiPlayCircleLine className={className} />
  if (type === CanvasNodeType.Audio) return <RiMusic2Line className={className} />
  if (type === CanvasNodeType.Config) return <RiSettings3Line className={className} />
  return <RiStackLine className={className} />
}

function getNodeTypeLabel(type: string): string {
  if (type === CanvasNodeType.Text) return "Text"
  if (type === CanvasNodeType.Image) return "Image"
  if (type === CanvasNodeType.Video) return "Video"
  if (type === CanvasNodeType.Audio) return "Audio"
  if (type === CanvasNodeType.Config) return "Config"
  return "Group"
}

function getDefaultTitle(type: string, t: (k: string) => string): string {
  if (type === CanvasNodeType.Text) return t("pages.workflows.canvasText")
  if (type === CanvasNodeType.Image) return t("pages.workflows.canvasImage")
  if (type === CanvasNodeType.Video) return t("pages.workflows.canvasVideo")
  if (type === CanvasNodeType.Audio) return t("pages.workflows.canvasAudio")
  if (type === CanvasNodeType.Config) return t("pages.workflows.canvasConfig")
  return t("pages.workflows.canvasGroup")
}
