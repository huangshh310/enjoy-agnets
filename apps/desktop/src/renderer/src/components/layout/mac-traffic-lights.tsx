/**
 * macOS 窗口按钮：左上角红 / 黄 / 绿圆点，顺序是关闭、最小化、缩放。
 * 悬停才露出符号。失焦时三颗都变灰。
 */
import { useEffect, useState, type ReactNode } from "react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { minimizeWindow } from "@renderer/lib/window-control"
import { requestCloseWindow } from "./window-quit-guard"

/** 符号用 neutral-925：暗色主题里图标 token 会翻成白，纯黑又被界面规范禁掉。 */
const GLYPH =
  "pointer-events-none absolute inset-0 m-auto size-2 text-neutral-925 opacity-0 group-hover/lights:opacity-100"

const INACTIVE = "bg-text-tertiary/40"

/** 聚焦时用饱和色；失焦三颗一起变灰，对齐 macOS 非活动窗口。 */
function lightFill(active: boolean) {
  if (!active) return { close: INACTIVE, min: INACTIVE, zoom: INACTIVE }
  return {
    close: "bg-text-error-primary",
    min: "bg-chart-8-active",
    zoom: "bg-chart-success"
  }
}

export function MacTrafficLights({
  isMaximized,
  onToggleMaximize
}: {
  isMaximized: boolean
  onToggleMaximize: () => void
}) {
  const t = useT()
  const fill = lightFill(useWindowActive())

  return (
    <div className="group/lights flex items-center gap-2" data-testid="mac-traffic-lights">
      <LightButton
        label={t("studio.window.closeWindow")}
        title={t("common.close")}
        className={fill.close}
        onClick={() => requestCloseWindow()}
      >
        <CloseGlyph />
      </LightButton>
      <LightButton
        label={t("studio.window.minimizeWindow")}
        title={t("studio.window.minimize")}
        className={fill.min}
        onClick={() => void minimizeWindow()}
      >
        <MinusGlyph />
      </LightButton>
      <LightButton
        label={isMaximized ? t("studio.window.restoreWindow") : t("studio.window.maximizeWindow")}
        title={isMaximized ? t("studio.window.restoreDown") : t("studio.window.maximize")}
        className={fill.zoom}
        onClick={onToggleMaximize}
      >
        {isMaximized ? <RestoreGlyph /> : <ZoomGlyph />}
      </LightButton>
    </div>
  )
}

function LightButton({
  label,
  title,
  className,
  onClick,
  children
}: {
  label: string
  title: string
  className: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      onDoubleClick={(event) => event.stopPropagation()}
      className={cx(
        "relative flex size-3 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        className
      )}
    >
      {children}
    </button>
  )
}

function useWindowActive(): boolean {
  const [active, setActive] = useState(() => typeof document !== "undefined" && document.hasFocus())
  useEffect(() => {
    const mark = () => setActive(document.hasFocus())
    window.addEventListener("focus", mark)
    window.addEventListener("blur", mark)
    return () => {
      window.removeEventListener("focus", mark)
      window.removeEventListener("blur", mark)
    }
  }, [])
  return active
}

function CloseGlyph() {
  return (
    <svg viewBox="0 0 12 12" className={cx("size-2", GLYPH)} aria-hidden>
      <path d="M3.2 3.2 L8.8 8.8 M8.8 3.2 L3.2 8.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function MinusGlyph() {
  return (
    <svg viewBox="0 0 12 12" className={cx("size-2", GLYPH)} aria-hidden>
      <path d="M2.6 6 H9.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function ZoomGlyph() {
  return (
    <svg viewBox="0 0 12 12" className={cx("size-2", GLYPH)} aria-hidden>
      <path d="M3.2 5.2 V3.2 H5.2 M8.8 6.8 V8.8 H6.8 M3.2 3.2 L5.4 5.4 M8.8 8.8 L6.6 6.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function RestoreGlyph() {
  return (
    <svg viewBox="0 0 12 12" className={cx("size-2", GLYPH)} aria-hidden>
      <path d="M8.8 6.8 V8.8 H6.8 M3.2 5.2 V3.2 H5.2 M8.8 8.8 L6.6 6.6 M3.2 3.2 L5.4 5.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
