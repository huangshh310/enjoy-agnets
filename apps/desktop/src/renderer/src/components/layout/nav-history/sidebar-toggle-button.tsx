/**
 * 标题栏上的侧栏折叠。和轨道里原来的开关共用 sidebarCollapsed。
 */
import { RiSideBarLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { useChatStore } from "@renderer/stores/chat-store"

export function SidebarToggleButton() {
  const t = useT()
  const collapsed = useChatStore((state) => state.sidebarCollapsed)
  const setCollapsed = useChatStore((state) => state.setSidebarCollapsed)
  const label = collapsed ? t("chat.expandSidebar") : t("chat.collapseSidebar")
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={!collapsed}
      data-testid="sidebar-toggle"
      onClick={() => setCollapsed(!collapsed)}
      onDoubleClick={(event) => event.stopPropagation()}
      className="flex size-6 cursor-pointer items-center justify-center rounded-md text-foreground-icon-secondary outline-none hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
    >
      <RiSideBarLine className="size-4" aria-hidden />
    </button>
  )
}
