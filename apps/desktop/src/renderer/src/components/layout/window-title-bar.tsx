/**
 * 自定义无边框窗口的顶部标题栏组件
 * 支持窗口拖拽 (-webkit-app-region: drag)、窗口控制按钮（最小化、最大化/还原、关闭）以及双击最大化
 */
import {
  RiCloseLine,
  RiSubtractLine,
  RiCheckboxMultipleBlankLine,
  RiSquareLine
} from "@remixicon/react"
import { AppMark } from "@renderer/components/brand/app-mark"
import { AppWordmark } from "@renderer/components/brand/app-wordmark"
import {
  closeWindow,
  minimizeWindow
} from "@renderer/lib/window-control"
import { useT } from "@renderer/i18n"

export function WindowTitleBar({
  isMaximized,
  onToggleMaximize
}: {
  isMaximized: boolean
  onToggleMaximize: () => void
}) {
  const t = useT()

  return (
    <header
      className="relative z-10 flex h-9 w-full shrink-0 select-none items-center justify-between px-3 text-text-secondary [app-region:drag]"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      onDoubleClick={onToggleMaximize}
    >
      {/* 左侧：应用名称与品牌标识 */}
      <div
        className="flex items-center gap-2 [app-region:no-drag]"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        aria-label={t("studio.window.brand")}
      >
        <AppMark size={16} />
        <AppWordmark />
      </div>

      {/* 中间：拖拽占位区 */}
      <div className="flex-1" />

      {/* 右侧：窗口控制按钮组 (最小化、最大化/还原、关闭) */}
      <div
        className="relative z-50 flex items-center gap-1 [app-region:no-drag]"
        style={{ WebkitAppRegion: "no-drag", pointerEvents: "auto" } as React.CSSProperties}
      >
        <button
          type="button"
          aria-label={t("studio.window.minimizeWindow")}
          title={t("studio.window.minimize")}
          onClick={(e) => {
            e.stopPropagation()
            void minimizeWindow()
          }}
          className="flex size-6 cursor-pointer items-center justify-center rounded-md text-foreground-icon-secondary outline-none transition-colors hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          <RiSubtractLine className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          aria-label={isMaximized ? t("studio.window.restoreWindow") : t("studio.window.maximizeWindow")}
          title={isMaximized ? t("studio.window.restoreDown") : t("studio.window.maximize")}
          onClick={(e) => {
            e.stopPropagation()
            onToggleMaximize()
          }}
          className="flex size-6 cursor-pointer items-center justify-center rounded-md text-foreground-icon-secondary outline-none transition-colors hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          {isMaximized ? (
            <RiCheckboxMultipleBlankLine className="size-3" aria-hidden />
          ) : (
            <RiSquareLine className="size-3" aria-hidden />
          )}
        </button>
        <button
          type="button"
          aria-label={t("studio.window.closeWindow")}
          title={t("common.close")}
          onClick={(e) => {
            e.stopPropagation()
            void closeWindow()
          }}
          className="flex size-6 cursor-pointer items-center justify-center rounded-md text-foreground-icon-secondary outline-none transition-colors hover:bg-state-error-text/15 hover:text-state-error-text focus-visible:ring-2 focus-visible:ring-state-error-text"
        >
          <RiCloseLine className="size-3.5" aria-hidden />
        </button>
      </div>
    </header>
  )
}
