"use client"

import { RiFolder6Line, RiLayoutRight2Line, RiMoreLine } from "@remixicon/react"
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels"
import { cx } from "@/utils/cx"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import {
  applySettingsSnapshot,
  decidePendingApproval,
  openChangedFile,
  openFolder,
  selectPersistedSession,
  abortComposerRun,
  attachComposerFile,
  sendComposerMessage,
  startPersistedSession,
} from "@renderer/hooks/use-agent-session"
import { getIde, hasIde } from "@renderer/lib/ide"
import type { SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { formatNodeTime, useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { RightPane } from "./right-pane/right-pane"
import { useRightPaneShortcuts } from "./right-pane/use-right-pane-shortcuts"
import { useRightPaneWidth } from "./right-pane/use-right-pane-width"
import { useExperimentalMediaGate } from "@renderer/hooks/experimental-media-gate"
import { AiChatComposer } from "./ai-chat-composer"
import { AiChatSidebar } from "./ai-chat-sidebar"
import { AiChatStatusBar } from "./ai-chat-status-bar"
import { AiChatThread } from "./ai-chat-thread"
import { ExperimentalMediaDialog } from "./experimental-media-dialog"
import { AiChatEmptyState } from "./empty-state/ai-chat-empty-state"
import { useT } from "@renderer/i18n"


export function AiChatShell() {
  const t = useT()
  const userName = useChatStore((state) => state.userName)
  const workspaceId = useChatStore((state) => state.workspaceId)
  const workspaceName = useChatStore((state) => state.workspaceName)
  const workspaceRootLabel = useChatStore((state) => state.workspaceRootLabel)
  const sessionTitle = useChatStore((state) => state.sessionTitle)
  const sessionId = useChatStore((state) => state.sessionId)
  const repositories = useChatStore((state) => state.repositories)
  const expandedIds = useChatStore((state) => state.expandedIds)
  const toggleExpanded = useChatStore((state) => state.toggleExpanded)
  const sidebarCollapsed = useChatStore((state) => state.sidebarCollapsed)
  const setSidebarCollapsed = useChatStore((state) => state.setSidebarCollapsed)
  const rightPanelCollapsed = useChatStore((state) => state.rightPanelCollapsed)
  const setRightPanelCollapsed = useChatStore((state) => state.setRightPanelCollapsed)
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const thinkingLabel = useChatStore((state) => state.thinkingLabel)
  const error = useChatStore((state) => state.error)
  const pendingApproval = useChatStore((state) => state.pendingApproval)
  const composer = useChatStore((state) => state.composer)
  const setComposer = useChatStore((state) => state.setComposer)
  const modelId = useChatStore((state) => state.modelId)
  const modelLabel = useChatStore((state) => state.modelLabel)
  const models = useChatStore((state) => state.models)
  const setModel = useChatStore((state) => state.setModel)
  const changes = useChatStore((state) => state.changes)
  const additions = useChatStore((state) => state.additions)
  const deletions = useChatStore((state) => state.deletions)
  const selectedFilePath = useChatStore((state) => state.selectedFilePath)
  const selectedFileContent = useChatStore((state) => state.selectedFileContent)
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "enjoy-agents-chat-split",
    storage: window.localStorage
  })
  useRightPaneShortcuts()
  const { groupRef, chatPanelRef, maximized, toggleWidth, resetWidth } = useRightPaneWidth()
  const experimentalGate = useExperimentalMediaGate({
    modelId,
    models,
    onSend: () => void sendComposerMessage(),
    onModelChange: (model) => void handleModelChange(model)
  })

  async function handleModelChange(model: ModelOption) {
    setModel(model.id, model.label, model.provider, model.reasoningEffort)
    if (hasIde()) {
      try {
        const snapshot = (await getIde().settings.setActiveModel({
          providerId: model.providerId,
          modelId: model.id
        })) as SettingsSnapshot
        await applySettingsSnapshot(snapshot)
      } catch {
        // ignore activation error
      }
    }
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
        onSelectSession={(id) => void selectPersistedSession(id)}
        onNewSession={() => void startPersistedSession()}
        onOpenWorkspace={() => void openFolder()}
        formatTime={formatNodeTime}
      />
      <Group
        id="enjoy-agents-chat-split"
        orientation="horizontal"
        className="h-full min-h-0 min-w-0 flex-1"
        groupRef={groupRef}
        defaultLayout={defaultLayout}
        onLayoutChanged={(layout, meta) => {
          // 展开占满或右栏收起时不要把 0/100 写进持久化布局
          if (maximized || Object.keys(layout).length < 2) return
          onLayoutChanged(layout, meta)
        }}
      >
        <Panel
          id="chat"
          panelRef={chatPanelRef}
          collapsible
          collapsedSize="0px"
          minSize="360px"
          defaultSize="62%"
          className="min-h-0 overflow-hidden bg-transparent"
        >
          <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl bg-background-primary-default shadow-card">
            {workspaceId ? (
              <>
                <header className="flex h-12 shrink-0 items-center gap-2 px-5">
                  <RiFolder6Line className="size-4 text-foreground-icon-secondary" aria-hidden />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <span className="text-body-medium text-text-secondary">{workspaceName}</span>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="text-body-medium text-text-primary">{sessionTitle}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                  <div className="ml-auto flex items-center gap-0.5">
                    <QuietIconButton
                      icon={RiLayoutRight2Line}
                      aria-label={rightPanelCollapsed ? t("chat.expandPane") : t("chat.collapsePane")}
                      aria-pressed={!rightPanelCollapsed}
                      onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                      className={!rightPanelCollapsed ? "bg-background-secondary-default text-text-primary" : undefined}
                    />
                    <QuietIconButton icon={RiMoreLine} aria-label={t("chat.sessionMenu")} />
                  </div>
                </header>
                {messages.length === 0 && !running ? (
                  <AiChatEmptyState
                    workspaceName={workspaceName}
                    workspaceRootLabel={workspaceRootLabel}
                    changesCount={changes.length}
                  >
                    <AiChatComposer
                      composer={composer}
                      onComposerChange={setComposer}
                      running={running}
                      modelLabel={modelLabel}
                      modelId={modelId}
                      models={models}
                      onModelChange={experimentalGate.requestModel}
                      onSend={experimentalGate.requestSend}
                      onStop={() => void abortComposerRun()}
                      onAttach={(file) => void attachComposerFile(file)}
                      className="px-0 pb-0"
                    />
                  </AiChatEmptyState>
                ) : (
                  <>
                    <AiChatThread
                      messages={messages}
                      running={running}
                      thinkingLabel={thinkingLabel}
                      error={error}
                      pendingApproval={pendingApproval}
                      onApprove={() => void decidePendingApproval("allow")}
                      onDeny={() => void decidePendingApproval("deny")}
                      onAllowSession={() => void decidePendingApproval("allow_session")}
                    />
                    <AiChatComposer
                      composer={composer}
                      onComposerChange={setComposer}
                      running={running}
                      modelLabel={modelLabel}
                      modelId={modelId}
                      models={models}
                      onModelChange={experimentalGate.requestModel}
                      onSend={experimentalGate.requestSend}
                      onStop={() => void abortComposerRun()}
                      onAttach={(file) => void attachComposerFile(file)}
                    />
                  </>
                )}
                <AiChatStatusBar workspaceRootLabel={workspaceRootLabel} />
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
                <p className="text-title-3-semibold text-text-primary">{t("chat.openWorkspace")}</p>
                <p className="max-w-sm text-body-medium text-text-secondary">
                  {t("chat.openWorkspaceHint")}
                </p>
                <Button onClick={() => void openFolder()}>
                  {t("chat.openFolder")}
                </Button>
              </div>
            )}
          </main>
        </Panel>
        {rightPanelCollapsed ? null : (
          <>
            <Separator
              disabled={maximized}
              className={cx(
                "relative z-10 shrink-0 bg-transparent outline-none",
                maximized
                  ? "w-0"
                  : "w-3 cursor-col-resize after:absolute after:inset-y-8 after:left-1/2 after:w-px after:-translate-x-1/2 after:rounded-full after:bg-transparent hover:after:bg-border-button-default data-active:after:bg-accent-500"
              )}
            />
            <Panel id="changes" minSize="280px" defaultSize="38%" className="min-h-0 bg-transparent">
              <RightPane
                workspaceId={workspaceId}
                changes={changes}
                additions={additions}
                deletions={deletions}
                selectedFilePath={selectedFilePath}
                selectedFileContent={selectedFileContent}
                onSelectFile={(path) => void openChangedFile(path)}
                onCollapse={() => {
                  resetWidth()
                  setRightPanelCollapsed(true)
                }}
                maximized={maximized}
                onToggleWidth={toggleWidth}
              />
            </Panel>
          </>
        )}
      </Group>
      <ExperimentalMediaDialog
        open={experimentalGate.promptOpen}
        onOpenChange={(open) => {
          if (!open) experimentalGate.cancel()
        }}
        onConfirm={() => void experimentalGate.confirm()}
      />
    </div>
  )
}

export default function AiChatPage() {
  return <AiChatShell />
}
