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
    boxShadow: "0 16px 40px rgba(28,25,23,.12)"
  }
  const activeStyle = { background: theme.toolbar.activeBg, color: theme.toolbar.activeText }

  return (
    <div className="absolute bottom-5 left-5 z-50" onMouseDown={(e) => e.stopPropagation()} data-canvas-no-zoom>
      <div className="flex h-14 items-center gap-1 rounded-xl border px-2 shadow-lg backdrop-blur" style={dockStyle}>
        <button
          type="button"
          title={t("pages.workflows.minimapToggle")}
          className="flex size-8 items-center justify-center rounded-lg"
          style={isMiniMapOpen ? activeStyle : { color: theme.toolbar.item }}
          onClick={onToggleMiniMap}
        >
          <RiCompass3Line className="size-4" />
        </button>
        <button type="button" title={t("pages.workflows.zoomFit")} className="flex size-8 items-center justify-center rounded-lg" onClick={onReset}>
          <RiFocus3Line className="size-4" />
        </button>
        <input
          type="range"
          min="5"
          max="500"
          step="1"
          value={Math.round(scale * 100)}
          className="w-24"
          style={{ accentColor: theme.node.activeStroke }}
          onChange={(event) => onScaleChange(Number(event.target.value) / 100)}
        />
        <span className="w-10 text-right text-xs tabular-nums" style={{ color: theme.node.muted }}>
          {Math.round(scale * 100)}%
        </span>
        <button type="button" className="flex size-8 items-center justify-center rounded-lg" onClick={() => setShortcutsOpen(true)}>
          <RiQuestionLine className="size-4" />
        </button>
      </div>
      {shortcutsOpen ? (
        <div
          className="absolute bottom-16 left-0 w-72 rounded-xl border p-3 text-sm shadow-xl"
          style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }}
        >
          <div className="mb-2 flex items-center justify-between font-medium">
            {t("pages.workflows.canvasShortcuts")}
            <button type="button" onClick={() => setShortcutsOpen(false)}>
              ×
            </button>
          </div>
          <p>Space / Ctrl + drag · {t("pages.workflows.canvasPan")}</p>
          <p>Wheel · {t("pages.workflows.zoomIn")}</p>
          <p>Cmd+C / V · copy paste</p>
          <p>Cmd+Z · {t("pages.workflows.undo")}</p>
          <p>Delete · {t("pages.workflows.canvasDelete")}</p>
        </div>
      ) : null}
    </div>
  )
}
