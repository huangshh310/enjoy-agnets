"use client"

import { RiFolder6Line, RiMoreLine } from "@remixicon/react"
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels"
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
  sendComposerMessage,
  startPersistedSession,
} from "@renderer/hooks/use-agent-session"
import { getIde, hasIde } from "@renderer/lib/ide"
import type { SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { contextUsed, formatNodeTime, useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { AiChatChangesPanel } from "./ai-chat-changes-panel"
import { AiChatComposer } from "./ai-chat-composer"
import { AiChatSidebar } from "./ai-chat-sidebar"
import { AiChatStatusBar } from "./ai-chat-status-bar"
import { AiChatThread } from "./ai-chat-thread"

export function AiChatShell() {
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
  const rightTab = useChatStore((state) => state.rightTab)
  const setRightTab = useChatStore((state) => state.setRightTab)
  const changes = useChatStore((state) => state.changes)
  const additions = useChatStore((state) => state.additions)
  const deletions = useChatStore((state) => state.deletions)
  const selectedFilePath = useChatStore((state) => state.selectedFilePath)
  const selectedFileContent = useChatStore((state) => state.selectedFileContent)
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "enjoy-agents-chat-split",
    storage: window.localStorage
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
    <div className="flex h-full min-h-0 gap-3 bg-background-full p-3">
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
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
      >
        <Panel id="chat" minSize="360px" defaultSize="62%" className="min-h-0 bg-transparent">
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
                  <div className="ml-auto">
                    <QuietIconButton icon={RiMoreLine} aria-label="Session menu" />
                  </div>
                </header>
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
                  onModelChange={(model) => void handleModelChange(model)}
                  onSend={() => void sendComposerMessage()}
                />
                <AiChatStatusBar
                  workspaceRootLabel={workspaceRootLabel}
                  contextUsed={contextUsed(messages)}
                />
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
                <p className="text-title-3-semibold text-text-primary">Open a workspace</p>
                <p className="max-w-sm text-body-medium text-text-secondary">
                  Enjoy Agents only runs against a folder you choose. Pick a project to load sessions and git changes.
                </p>
                <Button onClick={() => void openFolder()}>
                  Open folder
                </Button>
              </div>
            )}
          </main>
        </Panel>
        <Separator className="relative z-10 w-3 shrink-0 cursor-col-resize bg-transparent outline-none after:absolute after:inset-y-8 after:left-1/2 after:w-px after:-translate-x-1/2 after:rounded-full after:bg-transparent hover:after:bg-border-button-default data-active:after:bg-accent-500" />
        <Panel id="changes" minSize="280px" defaultSize="38%" className="min-h-0 bg-transparent">
          <AiChatChangesPanel
            workspaceId={workspaceId}
            rightTab={rightTab}
            onRightTabChange={setRightTab}
            changes={changes}
            additions={additions}
            deletions={deletions}
            selectedFilePath={selectedFilePath}
            selectedFileContent={selectedFileContent}
            onSelectFile={(path) => void openChangedFile(path)}
          />
        </Panel>
      </Group>
    </div>
  )
}

export default function AiChatPage() {
  return <AiChatShell />
}
