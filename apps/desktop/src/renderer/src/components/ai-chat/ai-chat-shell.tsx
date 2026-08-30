"use client"

import { RiFolder6Line, RiMoreLine } from "@remixicon/react"
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels"
import { Breadcrumb, BreadcrumbItem } from "@/components/base/breadcrumb/breadcrumb"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import { Button } from "@/components/base/buttons/button"
import {
  decidePendingApproval,
  openChangedFile,
  openFolder,
  saveApiKey,
  selectPersistedSession,
  sendComposerMessage,
  startPersistedSession,
  useAgentSession
} from "@renderer/hooks/use-agent-session"
import { contextUsed, formatNodeTime, useChatStore } from "@renderer/stores/chat-store"
import { AiChatChangesPanel } from "./ai-chat-changes-panel"
import { AiChatComposer } from "./ai-chat-composer"
import { AiChatKeysDialog } from "./ai-chat-keys-dialog"
import { AiChatSidebar } from "./ai-chat-sidebar"
import { AiChatStatusBar } from "./ai-chat-status-bar"
import { AiChatThread } from "./ai-chat-thread"

export function AiChatShell() {
  useAgentSession()
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
  const provider = useChatStore((state) => state.provider)
  const setModel = useChatStore((state) => state.setModel)
  const mode = useChatStore((state) => state.mode)
  const setMode = useChatStore((state) => state.setMode)
  const rightTab = useChatStore((state) => state.rightTab)
  const setRightTab = useChatStore((state) => state.setRightTab)
  const changes = useChatStore((state) => state.changes)
  const additions = useChatStore((state) => state.additions)
  const deletions = useChatStore((state) => state.deletions)
  const selectedFilePath = useChatStore((state) => state.selectedFilePath)
  const selectedFileContent = useChatStore((state) => state.selectedFileContent)
  const setSettingsOpen = useChatStore((state) => state.setSettingsOpen)
  const settingsOpen = useChatStore((state) => state.settingsOpen)
  const apiKeyDraft = useChatStore((state) => state.apiKeyDraft)
  const setApiKeyDraft = useChatStore((state) => state.setApiKeyDraft)
  const providerDraft = useChatStore((state) => state.providerDraft)
  const setProviderDraft = useChatStore((state) => state.setProviderDraft)
  const hasKey = useChatStore((state) => state.hasKey)
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "enjoy-agents-chat-split",
    storage: window.localStorage
  })

  const availableModels = provider
    ? models.filter((model) => model.provider === provider)
    : models

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
        onOpenSettings={() => setSettingsOpen("keys")}
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
                    <BreadcrumbItem>{workspaceName}</BreadcrumbItem>
                    <BreadcrumbItem current>{sessionTitle}</BreadcrumbItem>
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
                  models={availableModels}
                  onModelChange={setModel}
                  onSend={() => void sendComposerMessage()}
                />
                <AiChatStatusBar
                  workspaceRootLabel={workspaceRootLabel}
                  mode={mode}
                  onToggleMode={() => setMode(mode === "agent" ? "ask" : "agent")}
                  contextUsed={contextUsed(messages)}
                />
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
                <p className="text-title-3-semibold text-text-primary">Open a workspace</p>
                <p className="max-w-sm text-body-medium text-text-secondary">
                  Enjoy Agents only runs against a folder you choose. Pick a project to load sessions and git changes.
                </p>
                <Button variant="primary" onClick={() => void openFolder()}>
                  Open folder
                </Button>
              </div>
            )}
          </main>
        </Panel>
        <Separator className="relative z-10 w-3 shrink-0 cursor-col-resize bg-transparent outline-none after:absolute after:inset-y-8 after:left-1/2 after:w-px after:-translate-x-1/2 after:rounded-full after:bg-transparent hover:after:bg-border-button-default data-[active]:after:bg-accent-500" />
        <Panel id="changes" minSize="280px" defaultSize="38%" className="min-h-0 bg-transparent">
          <AiChatChangesPanel
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
      <AiChatKeysDialog
        open={settingsOpen === "keys"}
        apiKeyDraft={apiKeyDraft}
        providerDraft={providerDraft}
        hasKey={hasKey}
        onApiKeyChange={setApiKeyDraft}
        onProviderChange={setProviderDraft}
        onClose={() => setSettingsOpen(false)}
        onSave={() => void saveApiKey()}
      />
    </div>
  )
}

export default function AiChatPage() {
  return <AiChatShell />
}
