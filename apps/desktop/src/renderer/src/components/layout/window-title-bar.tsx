/**
 * 自定义无边框窗口的顶部标题栏。
 * macOS：红绿灯后是侧栏折叠和页面后退/前进。Win / Linux：这三个按钮靠左，窗口按钮在右。
 * 整条可拖，双击切换最大化。可点控件必须 no-drag。
 */
import { cx } from "@/utils/cx"
import { AppUpdateChip } from "@renderer/components/app-update/app-update-chip"
import { NavHistoryButtons } from "./nav-history/nav-history-buttons"
import { SidebarToggleButton } from "./nav-history/sidebar-toggle-button"
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
  const mac = isMacWindowChrome()

  return (
    <header
      className={cx(
        "relative z-30 flex h-9 w-full shrink-0 select-none items-center justify-between pr-3 text-text-secondary [app-region:drag]",
        mac ? "pl-5" : "pl-3"
      )}
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      onDoubleClick={onToggleMaximize}
    >
      <div
        className="flex items-center gap-3 [app-region:no-drag]"
        style={NO_DRAG}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        {mac ? <MacTrafficLights isMaximized={isMaximized} onToggleMaximize={onToggleMaximize} /> : null}
        <div className="flex items-center gap-1">
          <SidebarToggleButton />
          <NavHistoryButtons />
        </div>
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
