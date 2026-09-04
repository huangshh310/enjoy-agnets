/**
 * 第一张卡：轨道 + 情境栏。宽度走 constants，折叠只留轨道。
 */
import { useChatStore } from "@renderer/stores/chat-store"
import type { AppModuleId } from "../app-shell.types"
import { NAV_CARD_COLLAPSED_PX, NAV_CARD_EXPANDED_PX } from "../constants"
import { ActivityBar } from "./activity-bar"
import { ContextColumn } from "./context-column"

export function NavCard({
  activeModule,
  isChat,
  onSelect
}: {
  activeModule: AppModuleId
  isChat: boolean
  onSelect: (moduleId: AppModuleId, to: string) => void
}) {
  const collapsed = useChatStore((state) => state.sidebarCollapsed)
  const setCollapsed = useChatStore((state) => state.setSidebarCollapsed)
  const running = useChatStore((state) => state.running)

  function handleSelect(moduleId: AppModuleId, to: string) {
    if (collapsed) setCollapsed(false)
    onSelect(moduleId, to)
  }

  return (
    <aside
      style={{ width: collapsed ? NAV_CARD_COLLAPSED_PX : NAV_CARD_EXPANDED_PX }}
      className="flex h-full shrink-0 overflow-hidden rounded-3xl border border-border-button-white bg-background-secondary-default shadow-sidebar transition-[width] duration-300 ease-in-out"
    >
      <ActivityBar
        activeModule={activeModule}
        collapsed={collapsed}
        running={running}
        onToggleCollapsed={() => setCollapsed(!collapsed)}
        onSelect={handleSelect}
      />
      {collapsed ? null : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ContextColumn isChat={isChat} />
        </div>
      )}
    </aside>
  )
}
