/**
 * Agent Studio 统一大厅：左侧 Agent Rail + 右侧 Bento 控制台。
 */
import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AiChatSidebar } from "@renderer/components/ai-chat/ai-chat-sidebar"
import { openFolder, selectPersistedSession, startPersistedSession } from "@renderer/hooks/use-agent-session"
import { formatNodeTime, useChatStore } from "@renderer/stores/chat-store"
import { StudioHeader } from "./studio-header"
import { StudioHero } from "./studio-hero"
import { useStudioDashboard } from "./use-studio-dashboard"
import { StudioAssetsKnowledgeZone } from "./zones/assets-knowledge"
import { StudioConfigInsightsZone } from "./zones/config-insights"
import { StudioOrchestrationZone } from "./zones/orchestration"

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
        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-8 pt-6 pb-16">
            <StudioHero
              workspaceName={workspaceName}
              sources={dash.sources}
              totalChunks={dash.totalChunks}
              mcpServers={dash.mcpServers}
              connectedCount={dash.connectedServers.length}
              totalMcpTools={dash.totalMcpTools}
              automations={dash.automations}
              workflowRuns={dash.workflowRuns}
            />
            <StudioAssetsKnowledgeZone
              workspaceName={workspaceName}
              workspaceRootLabel={workspaceRootLabel}
              copiedPath={copiedPath}
              onCopyPath={handleCopyPath}
              onOpenChat={goChat}
              onOpenKnowledge={() => void navigate({ to: "/knowledge" })}
              onOpenMedia={() => void navigate({ to: "/media" })}
              sources={dash.sources}
              totalChunks={dash.totalChunks}
              isIndexing={dash.isIndexing}
              assets={dash.assets}
            />
            <StudioOrchestrationZone
              mcpServers={dash.mcpServers}
              connectedServers={dash.connectedServers}
              totalMcpTools={dash.totalMcpTools}
              workflowRuns={dash.workflowRuns}
              runningWorkflows={dash.runningWorkflows}
              automations={dash.automations}
              onOpenMcp={() => void navigate({ to: "/mcp" })}
              onOpenWorkflows={() => void navigate({ to: "/workflows" })}
              onOpenAutomations={() => void navigate({ to: "/automations" })}
            />
            <StudioConfigInsightsZone
              metrics={dash.metrics}
              latestMetric={dash.latestMetric}
              onOpenCustomize={() =>
                void navigate({ to: "/customize/$section", params: { section: "instructions" } })
              }
              onOpenObservability={() => void navigate({ to: "/observability" })}
            />
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}
