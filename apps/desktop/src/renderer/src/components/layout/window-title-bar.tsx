/**
 * 自定义无边框窗口的顶部标题栏。
 * macOS：左上角红绿灯，品牌字标跟在后面。Win / Linux：右侧线标按钮。
 * 整条可拖，双击切换最大化。可点控件必须 no-drag。
 */
import { cx } from "@/utils/cx"
import { AppMark } from "@renderer/components/brand/app-mark"
import { AppWordmark } from "@renderer/components/brand/app-wordmark"
import { AppUpdateChip } from "@renderer/components/app-update/app-update-chip"
import { useT } from "@renderer/i18n"
import { isMacWindowChrome } from "./window-chrome"
import { MacTrafficLights } from "./mac-traffic-lights"
import { TitleBarToggles } from "./title-bar-toggles"
import { WindowGlyphControls } from "./window-glyph-controls"

const NO_DRAG = { WebkitAppRegion: "no-drag", pointerEvents: "auto" } as React.CSSProperties

export function WindowTitleBar({
  isMaximized,
  onToggleMaximize
}: {
  isMaximized: boolean
  onToggleMaximize: () => void
}) {
  const t = useT()
  const mac = isMacWindowChrome()

  return (
    <header
      className={cx(
        "relative z-10 flex h-9 w-full shrink-0 select-none items-center justify-between pr-3 text-text-secondary [app-region:drag]",
        mac ? "pl-5" : "pl-3"
      )}
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      onDoubleClick={onToggleMaximize}
    >
      <div
        className="flex items-center gap-3 [app-region:no-drag]"
        style={NO_DRAG}
        aria-label={t("studio.window.brand")}
      >
        {mac ? <MacTrafficLights isMaximized={isMaximized} onToggleMaximize={onToggleMaximize} /> : null}
        <span className="flex items-center gap-2">
          <AppMark size={16} />
          <AppWordmark />
        </span>
      </div>

      <div className="flex-1" />

      <div className="relative z-50 flex items-center gap-1 [app-region:no-drag]" style={NO_DRAG}>
        <AppUpdateChip />
        <TitleBarToggles />
        {mac ? null : <WindowGlyphControls isMaximized={isMaximized} onToggleMaximize={onToggleMaximize} />}
      </div>
    </header>
  )
}
