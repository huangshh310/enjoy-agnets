/**
 * 底部浮动工具坞，对齐 infinite-canvas CanvasToolbar。
 */
import { useRef, useState } from "react"
import {
  RiAddLine,
  RiArrowGoBackLine,
  RiArrowGoForwardLine,
  RiCursorLine,
  RiDeleteBinLine,
  RiEraserLine,
  RiFileTextLine,
  RiHand,
  RiImageLine,
  RiMusic2Line,
  RiPlayCircleLine,
  RiSettings3Line,
  RiStackLine,
  RiUploadLine
} from "@remixicon/react"
import { useT } from "@renderer/i18n"
import type { CanvasBackgroundMode } from "../lib/canvas-theme"
import { useCanvasTheme } from "../stores/use-canvas-theme"

export function CanvasToolbar({
  selectedCount,
  canvasTool,
  canUndo,
  canRedo,
  backgroundMode,
  onAddImage,
  onAddVideo,
  onAddAudio,
  onAddText,
  onAddConfig,
  onAddGroup,
  onUndo,
  onRedo,
  onUpload,
  onDelete,
  onClear,
  onCanvasToolChange,
  onBackgroundModeChange
}: {
  selectedCount: number
  canvasTool: "select" | "pan"
  canUndo: boolean
  canRedo: boolean
  backgroundMode: CanvasBackgroundMode
  onAddImage: () => void
  onAddVideo: () => void
  onAddAudio: () => void
  onAddText: () => void
  onAddConfig: () => void
  onAddGroup: () => void
  onUndo: () => void
  onRedo: () => void
  onUpload: () => void
  onDelete: () => void
  onClear: () => void
  onCanvasToolChange: (tool: "select" | "pan") => void
  onBackgroundModeChange: (mode: CanvasBackgroundMode) => void
}) {
  const t = useT()
  const theme = useCanvasTheme()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const dockStyle = {
    background: theme.toolbar.panel,
    borderColor: theme.toolbar.border,
    color: theme.toolbar.item,
    boxShadow: "0 16px 40px rgba(28,25,23,.12)"
  }
  const hoverStyle = { background: theme.toolbar.itemHover, color: theme.toolbar.activeText }
  const activeStyle = { background: theme.toolbar.activeBg, color: theme.toolbar.activeText }

  return (
    <div className="pointer-events-none absolute bottom-5 left-0 right-0 z-50 flex justify-center">
      <div
        ref={wrapRef}
        className="pointer-events-auto flex h-14 items-center gap-1 rounded-xl border px-2 shadow-lg backdrop-blur"
        style={dockStyle}
      >
        <ToolBtn
          active={false}
          label={canvasTool === "select" ? t("pages.workflows.canvasSelect") : t("pages.workflows.canvasPan")}
          hovered={hovered}
          id="tool"
          hoverStyle={hoverStyle}
          onHover={setHovered}
          onClick={() => onCanvasToolChange(canvasTool === "select" ? "pan" : "select")}
        >
          {canvasTool === "select" ? <RiCursorLine className="size-4" /> : <RiHand className="size-4" />}
        </ToolBtn>
        <ToolBtn id="undo" label={t("pages.workflows.undo")} disabled={!canUndo} hovered={hovered} hoverStyle={hoverStyle} onHover={setHovered} onClick={onUndo}>
          <RiArrowGoBackLine className="size-4" />
        </ToolBtn>
        <ToolBtn id="redo" label={t("pages.workflows.redo")} disabled={!canRedo} hovered={hovered} hoverStyle={hoverStyle} onHover={setHovered} onClick={onRedo}>
          <RiArrowGoForwardLine className="size-4" />
        </ToolBtn>
        <div className="mx-1 h-6 w-px" style={{ background: theme.toolbar.border }} />
        <ToolBtn id="text" label={t("pages.workflows.canvasText")} hovered={hovered} hoverStyle={hoverStyle} onHover={setHovered} onClick={onAddText}>
          <RiFileTextLine className="size-4" />
        </ToolBtn>
        <ToolBtn id="image" label={t("pages.workflows.canvasImage")} hovered={hovered} hoverStyle={hoverStyle} onHover={setHovered} onClick={onAddImage}>
          <RiImageLine className="size-4" />
        </ToolBtn>
        <ToolBtn id="video" label={t("pages.workflows.canvasVideo")} hovered={hovered} hoverStyle={hoverStyle} onHover={setHovered} onClick={onAddVideo}>
          <RiPlayCircleLine className="size-4" />
        </ToolBtn>
        <ToolBtn id="audio" label={t("pages.workflows.canvasAudio")} hovered={hovered} hoverStyle={hoverStyle} onHover={setHovered} onClick={onAddAudio}>
          <RiMusic2Line className="size-4" />
        </ToolBtn>
        <ToolBtn id="config" label={t("pages.workflows.canvasConfig")} hovered={hovered} hoverStyle={hoverStyle} onHover={setHovered} onClick={onAddConfig}>
          <RiSettings3Line className="size-4" />
        </ToolBtn>
        <ToolBtn id="group" label={t("pages.workflows.canvasGroup")} hovered={hovered} hoverStyle={hoverStyle} onHover={setHovered} onClick={onAddGroup}>
          <RiStackLine className="size-4" />
        </ToolBtn>
        <ToolBtn id="upload" label={t("pages.workflows.canvasUpload")} hovered={hovered} hoverStyle={hoverStyle} onHover={setHovered} onClick={onUpload}>
          <RiUploadLine className="size-4" />
        </ToolBtn>
        <div className="mx-1 h-6 w-px" style={{ background: theme.toolbar.border }} />
        {(["dots", "lines", "blank"] as CanvasBackgroundMode[]).map((mode) => (
          <ToolBtn
            key={mode}
            id={mode}
            label={mode}
            active={backgroundMode === mode}
            activeStyle={activeStyle}
            hovered={hovered}
            hoverStyle={hoverStyle}
            onHover={setHovered}
            onClick={() => onBackgroundModeChange(mode)}
          >
            <span className="text-[10px] font-medium">{mode}</span>
          </ToolBtn>
        ))}
        {selectedCount ? (
          <ToolBtn id="delete" label={t("pages.workflows.canvasDelete")} hovered={hovered} hoverStyle={hoverStyle} onHover={setHovered} onClick={onDelete}>
            <RiDeleteBinLine className="size-4 text-red-400" />
          </ToolBtn>
        ) : null}
        <ToolBtn id="clear" label={t("pages.workflows.canvasClear")} hovered={hovered} hoverStyle={hoverStyle} onHover={setHovered} onClick={onClear}>
          <RiEraserLine className="size-4 text-red-400" />
        </ToolBtn>
        <ToolBtn id="add" label={t("pages.workflows.newWorkflow")} hovered={hovered} hoverStyle={hoverStyle} onHover={setHovered} onClick={onAddText}>
          <RiAddLine className="size-4" />
        </ToolBtn>
      </div>
    </div>
  )
}

function ToolBtn({
  id,
  label,
  children,
  onClick,
  disabled,
  active,
  hovered,
  hoverStyle,
  activeStyle,
  onHover
}: {
  id: string
  label: string
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  active?: boolean
  hovered: string | null
  hoverStyle: React.CSSProperties
  activeStyle?: React.CSSProperties
  onHover: (id: string | null) => void
}) {
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      className="flex size-9 items-center justify-center rounded-lg disabled:opacity-30"
      style={active ? activeStyle : hovered === id ? hoverStyle : undefined}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
