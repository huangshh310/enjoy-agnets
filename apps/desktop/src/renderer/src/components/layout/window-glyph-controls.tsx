/**
 * Windows / Linux 标题栏按钮：右侧线标，顺序是最小化、最大化、关闭。
 */
import type { ReactNode } from "react"
import { RiCheckboxMultipleBlankLine, RiCloseLine, RiSquareLine, RiSubtractLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { minimizeWindow } from "@renderer/lib/window-control"
import { requestCloseWindow } from "./window-quit-guard"

const BUTTON =
  "flex size-6 cursor-pointer items-center justify-center rounded-md text-foreground-icon-secondary outline-none transition-colors hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"

const CLOSE =
  "flex size-6 cursor-pointer items-center justify-center rounded-md text-foreground-icon-secondary outline-none transition-colors hover:bg-text-error-primary/15 hover:text-text-error-primary focus-visible:ring-2 focus-visible:ring-border-error-default"

export function WindowGlyphControls({
  isMaximized,
  onToggleMaximize
}: {
  isMaximized: boolean
  onToggleMaximize: () => void
}) {
  const t = useT()
  const zoomLabel = isMaximized ? t("studio.window.restoreWindow") : t("studio.window.maximizeWindow")
  const zoomTitle = isMaximized ? t("studio.window.restoreDown") : t("studio.window.maximize")
  return (
    <div className="flex items-center gap-1" data-testid="window-glyph-controls">
      <GlyphButton
        label={t("studio.window.minimizeWindow")}
        title={t("studio.window.minimize")}
        className={BUTTON}
        onClick={() => void minimizeWindow()}
      >
        <RiSubtractLine className="size-3.5" aria-hidden />
      </GlyphButton>
      <GlyphButton label={zoomLabel} title={zoomTitle} className={BUTTON} onClick={onToggleMaximize}>
        {isMaximized ? (
          <RiCheckboxMultipleBlankLine className="size-3" aria-hidden />
        ) : (
          <RiSquareLine className="size-3" aria-hidden />
        )}
      </GlyphButton>
      <GlyphButton label={t("studio.window.closeWindow")} title={t("common.close")} className={CLOSE} onClick={() => requestCloseWindow()}>
        <RiCloseLine className="size-3.5" aria-hidden />
      </GlyphButton>
    </div>
  )
}

function GlyphButton(props: {
  label: string
  title: string
  className: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.title}
      onClick={(event) => {
        event.stopPropagation()
        props.onClick()
      }}
      className={props.className}
    >
      {props.children}
    </button>
  )
}
