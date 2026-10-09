import { useEffect, useRef, useState } from "react"
import {
  RiArrowGoBackLine,
  RiArrowGoForwardLine,
  RiCursorLine,
  RiDeleteBinLine,
  RiEraserLine,
  RiFileTextLine,
  RiGridLine,
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
  const [tipLabel, setTipLabel] = useState("")
  const [tipX, setTipX] = useState(0)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!appearanceOpen) return
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setAppearanceOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [appearanceOpen])

  const dockStyle = {
    background: theme.toolbar.panel,
    borderColor: theme.toolbar.border,
    color: theme.toolbar.item,
    boxShadow: "0 16px 36px rgba(15,23,42,.12), 0 2px 6px rgba(0,0,0,.04)"
  }
  const hoverStyle = { background: theme.toolbar.itemHover, color: theme.toolbar.activeText }
  const activeStyle = { background: theme.toolbar.activeBg, color: theme.toolbar.activeText }

  function handleButtonHover(id: string | null, label = "", buttonEl?: HTMLElement) {
    if (!id || !buttonEl || !wrapRef.current) {
      setTipLabel("")
      return
    }
    const wrapRect = wrapRef.current.getBoundingClientRect()
    const btnRect = buttonEl.getBoundingClientRect()
    setTipX(btnRect.left - wrapRect.left + btnRect.width / 2)
    setTipLabel(label)
  }

  return (
    <div className="pointer-events-none absolute bottom-5 left-0 right-0 z-50 flex justify-center">
      <div className="relative pointer-events-auto">
        {tipLabel && (
          <div
            className="pointer-events-none absolute -top-8 z-50 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-0.5 text-caption-2-medium font-medium text-white shadow-md transition-all duration-150"
            style={{
              left: tipX,
              background: "rgba(15, 23, 42, 0.9)",
              backdropFilter: "blur(4px)"
            }}
          >
            {tipLabel}
          </div>
        )}

        <div
          ref={wrapRef}
          className="flex h-12 items-center gap-1 rounded-2xl border px-2 shadow-lg backdrop-blur-md"
          style={dockStyle}
        >
          {/* 选择 / 抓手分段切换 */}
          <div className="flex items-center rounded-xl p-0.5" style={{ background: theme.toolbar.itemHover }}>
            <ToolBtn
              id="select"
              label={`${t("pages.workflows.canvasSelect")} (V)`}
              active={canvasTool === "select"}
              activeStyle={activeStyle}
              hoverStyle={hoverStyle}
              onHover={handleButtonHover}
              onClick={() => onCanvasToolChange("select")}
            >
              <RiCursorLine className="size-4" />
            </ToolBtn>
            <ToolBtn
              id="pan"
              label={`${t("pages.workflows.canvasPan")} (H / Space)`}
              active={canvasTool === "pan"}
              activeStyle={activeStyle}
              hoverStyle={hoverStyle}
              onHover={handleButtonHover}
              onClick={() => onCanvasToolChange("pan")}
            >
              <RiHand className="size-4" />
            </ToolBtn>
          </div>

          {/* 撤销 / 重做 */}
          <ToolBtn
            id="undo"
            label={`${t("pages.workflows.undo")} (⌘Z)`}
            disabled={!canUndo}
            hoverStyle={hoverStyle}
            onHover={handleButtonHover}
            onClick={onUndo}
          >
            <RiArrowGoBackLine className="size-4" />
          </ToolBtn>
          <ToolBtn
            id="redo"
            label={`${t("pages.workflows.redo")} (⌘⇧Z)`}
            disabled={!canRedo}
            hoverStyle={hoverStyle}
            onHover={handleButtonHover}
            onClick={onRedo}
          >
            <RiArrowGoForwardLine className="size-4" />
          </ToolBtn>

          <div className="mx-1 h-5 w-px opacity-40" style={{ background: theme.toolbar.border }} />

          {/* 节点添加 */}
          <ToolBtn id="text" label={`${t("pages.workflows.canvasText")} (T)`} hoverStyle={hoverStyle} onHover={handleButtonHover} onClick={onAddText}>
            <RiFileTextLine className="size-4" />
          </ToolBtn>
          <ToolBtn id="image" label={`${t("pages.workflows.canvasImage")} (I)`} hoverStyle={hoverStyle} onHover={handleButtonHover} onClick={onAddImage}>
            <RiImageLine className="size-4" />
          </ToolBtn>
          <ToolBtn id="video" label={t("pages.workflows.canvasVideo")} hoverStyle={hoverStyle} onHover={handleButtonHover} onClick={onAddVideo}>
            <RiPlayCircleLine className="size-4" />
          </ToolBtn>
          <ToolBtn id="audio" label={t("pages.workflows.canvasAudio")} hoverStyle={hoverStyle} onHover={handleButtonHover} onClick={onAddAudio}>
            <RiMusic2Line className="size-4" />
          </ToolBtn>
          <ToolBtn id="config" label={t("pages.workflows.canvasConfig")} hoverStyle={hoverStyle} onHover={handleButtonHover} onClick={onAddConfig}>
            <RiSettings3Line className="size-4" />
          </ToolBtn>
          <ToolBtn id="group" label={`${t("pages.workflows.canvasGroup")} (⌘G)`} hoverStyle={hoverStyle} onHover={handleButtonHover} onClick={onAddGroup}>
            <RiStackLine className="size-4" />
          </ToolBtn>
          <ToolBtn id="upload" label={t("pages.workflows.canvasUpload")} hoverStyle={hoverStyle} onHover={handleButtonHover} onClick={onUpload}>
            <RiUploadLine className="size-4" />
          </ToolBtn>

          <div className="mx-1 h-5 w-px opacity-40" style={{ background: theme.toolbar.border }} />

          {/* 外观与网格设置 */}
          <div className="relative" ref={popoverRef}>
            <ToolBtn
              id="appearance"
              label={t("pages.workflows.canvasAppearance")}
              active={appearanceOpen}
              activeStyle={activeStyle}
              hoverStyle={hoverStyle}
              onHover={handleButtonHover}
              onClick={() => setAppearanceOpen((prev) => !prev)}
            >
              <RiGridLine className="size-4" />
            </ToolBtn>

            {appearanceOpen && (
              <div
                className="absolute bottom-14 right-0 z-50 w-52 rounded-xl border p-2.5 shadow-xl backdrop-blur-md"
                style={{
                  background: theme.toolbar.panel,
                  borderColor: theme.toolbar.border,
                  color: theme.node.text
                }}
              >
                <div className="mb-2 px-1 text-caption-2-semibold font-semibold tracking-wide text-text-secondary">
                  {t("pages.workflows.canvasAppearance")}
                </div>
                <div className="flex flex-col gap-1">
                  {(["dots", "lines", "blank"] as CanvasBackgroundMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`flex h-8 items-center justify-between rounded-lg px-2.5 text-xs font-medium transition ${
                        backgroundMode === mode ? "bg-accent-500/10 text-accent-500 dark:text-accent-500" : "hover:bg-background-secondary-default dark:hover:bg-background-secondary-default/60"
                      }`}
                      onClick={() => {
                        onBackgroundModeChange(mode)
                        setAppearanceOpen(false)
                      }}
                    >
                      <span>
                        {mode === "dots"
                          ? t("pages.workflows.canvasBackgroundDots")
                          : mode === "lines"
                            ? t("pages.workflows.canvasBackgroundLines")
                            : t("pages.workflows.canvasBackgroundBlank")}
                      </span>
                      {backgroundMode === mode && <span className="size-1.5 rounded-full bg-accent-500" />}
                    </button>
                  ))}
                </div>

                <div className="my-2 h-px opacity-40" style={{ background: theme.toolbar.border }} />

                <button
                  type="button"
                  className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-text-error-primary transition hover:bg-background-tertiary-error/10"
                  onClick={() => {
                    if (window.confirm("确定要清空当前画布上的所有节点和连线吗？")) {
                      onClear()
                      setAppearanceOpen(false)
                    }
                  }}
                >
                  <RiEraserLine className="size-3.5" />
                  <span>{t("pages.workflows.canvasClear")}</span>
                </button>
              </div>
            )}
          </div>

          {/* 选中有节点时显示的删除按钮 */}
          {selectedCount > 0 && (
            <ToolBtn
              id="delete"
              label={`${t("pages.workflows.canvasDelete")} (Del)`}
              hoverStyle={{ background: "rgba(244,63,94,0.1)", color: "#f43f5e" }}
              onHover={handleButtonHover}
              onClick={onDelete}
            >
              <RiDeleteBinLine className="size-4 text-text-error-primary" />
            </ToolBtn>
          )}
        </div>
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
  hoverStyle: React.CSSProperties
  activeStyle?: React.CSSProperties
  onHover: (id: string | null, label: string, el?: HTMLElement) => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  return (
    <button
      type="button"
      disabled={disabled}
      className="flex size-8 items-center justify-center rounded-lg transition-colors disabled:opacity-30"
      style={active ? activeStyle : isHovered ? hoverStyle : undefined}
      onMouseEnter={(e) => {
        setIsHovered(true)
        onHover(id, label, e.currentTarget)
      }}
      onMouseLeave={() => {
        setIsHovered(false)
        onHover(null, "")
      }}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
