/**
 * 标题栏辅助开关：昼/夜与语言，小号手绘胶囊，点按不抢窗口拖拽。
 */
import { ThemeToggle } from "@/components/application/theme/theme-toggle"
import { SidebarLocaleToggle } from "@renderer/components/ai-chat/sidebar/sidebar-locale-toggle"

export function TitleBarToggles() {
  return (
    <div
      className="mr-1.5 flex items-center gap-1.5 [app-region:no-drag]"
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <ThemeToggle appearance="sidebar-segmented" compact />
      <SidebarLocaleToggle compact />
    </div>
  )
}
