/**
 * Agent Studio 统一大厅：左侧 Agent Rail + 右侧分领域工坊工作台。
 * 采用选项卡架构与紧凑全景条，彻底消除无限平铺长滚动。
 */
import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AiChatSidebar } from "@renderer/components/ai-chat/ai-chat-sidebar"
import {
  openFolder,
  selectPersistedSession,
  startPersistedSession
} from "@renderer/hooks/use-agent-session"
import { formatNodeTime, useChatStore } from "@renderer/stores/chat-store"
import { StudioCompactHero } from "./studio-compact-hero"
import { StudioHeader } from "./studio-header"
import { StudioNavTabs } from "./studio-nav-tabs"
import type { StudioTab } from "./studio.types"
import { useStudioDashboard } from "./use-studio-dashboard"
import { StudioExtensionsView } from "./views/extensions-view"
import { StudioGroundingView } from "./views/grounding-view"
import { StudioOpsView } from "./views/ops-view"
import { StudioOverviewView } from "./views/overview-view"

export function AgentStudioPage() {
  const navigate = useNavigate()
  const userName = useChatStore((state) => state.userName)
  const workspaceId = useChatStore((state) => state.workspaceId)
  const workspaceName = useChatStore((state) => state.workspaceName)
  const workspaceRootLabel = useChatStore((state) => state.workspaceRootLabel)
  const sessionId = useChatStore((state) => state.sessionId)
  const repositories = useChatStore((state) => state.repositories)
  const expandedIds = useChatStore((state) => state.expandedIds)
  const toggleExpanded = useChatStore((state) => state.toggleExpanded)
  const sidebarCollapsed = useChatStore((state) => state.sidebarCollapsed)
  const setSidebarCollapsed = useChatStore((state) => state.setSidebarCollapsed)
  const [copiedPath, setCopiedPath] = useState(false)
  const [activeTab, setActiveTab] = useState<StudioTab>("overview")
  const dash = useStudioDashboard(workspaceId)

  function goChat() {
    void navigate({ to: "/" })
  }

  function handleCopyPath() {
    if (!workspaceRootLabel) return
    void navigator.clipboard.writeText(workspaceRootLabel)
    setCopiedPath(true)
    setTimeout(() => setCopiedPath(false), 2000)
  }

  function handleNavigateTo(path: string) {
    void navigate({ to: path as unknown as "/" })
  }

  const commonProps = {
    workspaceName,
    workspaceRootLabel,
    copiedPath,
    onCopyPath: handleCopyPath,
    onOpenChat: goChat,
    dash,
    onNavigateTo: handleNavigateTo
  }

  return (
    <div className="flex h-full min-h-0 gap-3 bg-background-full px-3 pb-3">
      <AiChatSidebar
        userName={userName}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
        repositories={repositories}
        expandedIds={expandedIds}
        sessionId={sessionId}
        onToggleExpanded={toggleExpanded}
        onSelectSession={(id) => {
          void selectPersistedSession(id)
          goChat()
        }}
        onNewSession={() => {
          void startPersistedSession()
          goChat()
        }}
        onOpenWorkspace={() => void openFolder()}
        formatTime={formatNodeTime}
      />
      <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border-button-default/40 bg-background-primary-default shadow-card">
        <StudioHeader
          onNewChat={() => {
            void startPersistedSession()
            goChat()
          }}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ScrollArea className="min-h-0 flex-1">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-8 pt-5 pb-16">
              {/* 1. 紧凑全景条 */}
              <StudioCompactHero workspaceName={workspaceName} dash={dash} />

              {/* 2. 四大领域分段控制器 */}
              <div className="flex items-center justify-between">
                <StudioNavTabs
                  activeTab={activeTab}
                  onSelectTab={setActiveTab}
                  dash={dash}
                />
              </div>

              {/* 3. 当前工坊主视图切片 */}
              <section className="mt-1 min-h-0 flex-1">
                {activeTab === "overview" && <StudioOverviewView {...commonProps} />}
                {activeTab === "grounding" && <StudioGroundingView {...commonProps} />}
                {activeTab === "extensions" && <StudioExtensionsView {...commonProps} />}
                {activeTab === "ops" && <StudioOpsView {...commonProps} />}
              </section>
            </div>
          </ScrollArea>
        </div>
      </main>
    </div>
  )
}
