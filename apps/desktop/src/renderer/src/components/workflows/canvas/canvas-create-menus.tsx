/**
 * 双击空白 / 拉线落空时的新建菜单，对齐 infinite-canvas create menus。
 */
import { RiFileTextLine, RiImageLine, RiMusic2Line, RiPlayCircleLine, RiSettings3Line } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { CanvasNodeType, type ConnectionHandle, type Position } from "../lib/canvas.types"
import { useCanvasTheme } from "../stores/use-canvas-theme"

export type PendingConnectionCreate = {
  connection: ConnectionHandle
  position: Position
}

const OPTIONS = [
  { type: CanvasNodeType.Text, icon: RiFileTextLine, titleKey: "pages.workflows.canvasText" },
  { type: CanvasNodeType.Image, icon: RiImageLine, titleKey: "pages.workflows.canvasImage" },
  { type: CanvasNodeType.Video, icon: RiPlayCircleLine, titleKey: "pages.workflows.canvasVideo" },
  { type: CanvasNodeType.Audio, icon: RiMusic2Line, titleKey: "pages.workflows.canvasAudio" },
  { type: CanvasNodeType.Config, icon: RiSettings3Line, titleKey: "pages.workflows.canvasConfig" }
] as const

export function ConnectionCreateMenu({
  pending,
  onCreate,
  onClose
}: {
  pending: PendingConnectionCreate
  onCreate: (type: (typeof OPTIONS)[number]["type"]) => void
  onClose: () => void
}) {
  const theme = useCanvasTheme()
  const t = useT()
  return (
    <div
      className="absolute z-[120] w-[300px] rounded-[18px] border p-3 shadow-2xl backdrop-blur"
      data-connection-create-menu
      style={{ left: pending.position.x, top: pending.position.y, background: theme.node.panel, borderColor: theme.node.stroke, color: theme.node.text }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-medium" style={{ color: theme.node.muted }}>
          {t("pages.workflows.canvasFromNode")}
        </span>
        <button type="button" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="grid gap-1">
        {OPTIONS.map((option) => (
          <button
            key={option.type}
            type="button"
            className="flex h-14 w-full items-center gap-3 rounded-2xl px-3 text-left"
            onClick={() => onCreate(option.type)}
            onMouseEnter={(event) => (event.currentTarget.style.background = theme.node.fill)}
            onMouseLeave={(event) => (event.currentTarget.style.background = "transparent")}
          >
            <span className="grid size-11 place-items-center rounded-xl" style={{ background: theme.node.fill }}>
              <option.icon className="size-5" />
            </span>
            <span className="text-base font-semibold">{t(option.titleKey)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function NodeCreateMenu({
  position,
  onCreate,
  onClose
}: {
  position: Position
  onCreate: (type: string) => void
  onClose: () => void
}) {
  const theme = useCanvasTheme()
  const t = useT()
  return (
    <div
      className="absolute z-[120] w-[260px] rounded-[18px] border p-2 shadow-2xl"
      style={{ left: position.x, top: position.y, background: theme.node.panel, borderColor: theme.node.stroke }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.type}
          type="button"
          className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm"
          onClick={() => {
            onCreate(option.type)
            onClose()
          }}
        >
          <option.icon className="size-4" />
          {t(option.titleKey)}
        </button>
      ))}
    </div>
  )
}
