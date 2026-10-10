/**
 * 第一张卡右侧情境栏：Chat 为会话树，其它模块读 module-nav-store。
 */
import { AiChatSidebar } from "@renderer/components/ai-chat/ai-chat-sidebar"
import { SidebarUserCard } from "@renderer/components/ai-chat/sidebar/sidebar-user-card"
import {
  openFolder,
  selectPersistedSession,
  startPersistedSession
} from "@renderer/hooks/use-agent-session"
import { formatNodeTime, useChatStore } from "@renderer/stores/chat-store"
import { ModuleNav } from "./module-nav"

export function ContextColumn({ isChat }: { isChat: boolean }) {
  const userName = useChatStore((state) => state.userName)
  const repositories = useChatStore((state) => state.repositories)
  const expandedIds = useChatStore((state) => state.expandedIds)
  const sessionId = useChatStore((state) => state.sessionId)
  const toggleExpanded = useChatStore((state) => state.toggleExpanded)
  const sessionCount = repositories.filter((node) => node.kind === "session").length

  if (isChat) {
    return (
      <AiChatSidebar
        userName={userName}
        repositories={repositories}
        expandedIds={expandedIds}
        sessionId={sessionId}
        onToggleExpanded={toggleExpanded}
        onSelectSession={(id) => void selectPersistedSession(id)}
        onNewSession={() => void startPersistedSession()}
        onOpenWorkspace={() => void openFolder()}
        formatTime={formatNodeTime}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ModuleNav />
      </div>
      <div className="shrink-0 px-2 pb-2 pt-1">
        <SidebarUserCard
          collapsed={false}
          userName={userName}
          sessionCount={sessionCount}
          onOpenWorkspace={() => void openFolder()}
        />
      </div>
    </div>
  )
}
