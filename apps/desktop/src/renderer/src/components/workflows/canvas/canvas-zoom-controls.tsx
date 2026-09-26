/**
 * 左下角缩放坞，对齐 infinite-canvas CanvasZoomControls。
 */
import { useState } from "react"
import { RiCompass3Line, RiFocus3Line, RiQuestionLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { useCanvasTheme } from "../stores/use-canvas-theme"

export function CanvasZoomControls({
  scale,
  onScaleChange,
  onReset,
  isMiniMapOpen,
  onToggleMiniMap
}: {
  scale: number
  onScaleChange: (scale: number) => void
  onReset: () => void
  isMiniMapOpen: boolean
  onToggleMiniMap: () => void
}) {
  const t = useT()
  const theme = useCanvasTheme()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const dockStyle = {
    background: theme.toolbar.panel,
    borderColor: theme.toolbar.border,
    color: theme.toolbar.item,
    boxShadow: "0 16px 36px rgba(15,23,42,.12), 0 2px 6px rgba(0,0,0,.04)"
  }
  const activeStyle = { background: theme.toolbar.activeBg, color: theme.toolbar.activeText }

  return (
    <div className="absolute bottom-5 left-5 z-50" onMouseDown={(e) => e.stopPropagation()} data-canvas-no-zoom>
      <div className="flex h-12 items-center gap-1.5 rounded-2xl border px-2.5 shadow-lg backdrop-blur-md" style={dockStyle}>
        <button
          type="button"
          title={t("pages.workflows.minimapToggle")}
          className="flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-background-secondary-default dark:hover:bg-background-secondary-default"
          style={isMiniMapOpen ? activeStyle : { color: theme.toolbar.item }}
          onClick={onToggleMiniMap}
        >
          <RiCompass3Line className="size-4" />
        </button>
        <button
          type="button"
          title={t("pages.workflows.zoomFit")}
          className="flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-background-secondary-default dark:hover:bg-background-secondary-default"
          onClick={onReset}
        >
          <RiFocus3Line className="size-4" />
        </button>

        <div className="mx-0.5 h-4 w-px opacity-40" style={{ background: theme.toolbar.border }} />

        <input
          type="range"
          min="5"
          max="500"
          step="1"
          value={Math.round(scale * 100)}
          className="w-20 cursor-pointer accent-accent-500"
          onChange={(event) => onScaleChange(Number(event.target.value) / 100)}
        />
        <span className="w-11 text-right font-mono text-caption-2-regular tabular-nums opacity-80" style={{ color: theme.node.text }}>
          {Math.round(scale * 100)}%
        </span>

        <button
          type="button"
          title={t("pages.workflows.canvasShortcuts")}
          className="flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-background-secondary-default dark:hover:bg-background-secondary-default"
          onClick={() => setShortcutsOpen(true)}
        >
          <RiQuestionLine className="size-4" />
        </button>
      </div>

      {shortcutsOpen ? (
        <div
          className="absolute bottom-16 left-0 w-72 rounded-2xl border p-3.5 text-xs shadow-2xl backdrop-blur-md"
          style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }}
        >
          <div className="mb-2.5 flex items-center justify-between font-semibold">
            <span>{t("pages.workflows.canvasShortcuts")}</span>
            <button
              type="button"
              className="flex size-5 items-center justify-center rounded hover:bg-background-secondary-default dark:hover:bg-background-secondary-default text-text-secondary hover:text-text-secondary dark:hover:text-text-secondary"
              onClick={() => setShortcutsOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="space-y-1.5 text-text-secondary dark:text-text-secondary">
            <div className="flex items-center justify-between"><kbd className="rounded bg-background-secondary-default dark:bg-background-secondary-default px-1.5 py-0.5 font-mono text-caption-2-regular">Space / Ctrl + 拖拽</kbd><span>{t("pages.workflows.canvasPan")}</span></div>
            <div className="flex items-center justify-between"><kbd className="rounded bg-background-secondary-default dark:bg-background-secondary-default px-1.5 py-0.5 font-mono text-caption-2-regular">鼠标滚轮</kbd><span>{t("pages.workflows.zoomIn")}</span></div>
            <div className="flex items-center justify-between"><kbd className="rounded bg-background-secondary-default dark:bg-background-secondary-default px-1.5 py-0.5 font-mono text-caption-2-regular">⌘ / Ctrl + C / V</kbd><span>复制 / 粘贴</span></div>
            <div className="flex items-center justify-between"><kbd className="rounded bg-background-secondary-default dark:bg-background-secondary-default px-1.5 py-0.5 font-mono text-caption-2-regular">⌘ / Ctrl + Z</kbd><span>{t("pages.workflows.undo")}</span></div>
            <div className="flex items-center justify-between"><kbd className="rounded bg-background-secondary-default dark:bg-background-secondary-default px-1.5 py-0.5 font-mono text-caption-2-regular">Delete / Backspace</kbd><span>{t("pages.workflows.canvasDelete")}</span></div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
