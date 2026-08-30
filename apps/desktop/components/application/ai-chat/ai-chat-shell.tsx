"use client"

import { RiFolder6Line, RiMoreLine } from "@remixicon/react"
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels"
import { Breadcrumb, BreadcrumbItem } from "@/components/base/breadcrumb/breadcrumb"
import { useAgentSession } from "@renderer/hooks/use-agent-session"
import { useChatStore } from "@renderer/stores/chat-store"
import { AiChatChangesPanel } from "./ai-chat-changes-panel"
import { AiChatComposer } from "./ai-chat-composer"
import { AiChatKeysDialog } from "./ai-chat-keys-dialog"
import { AiChatSidebar } from "./ai-chat-sidebar"
import { AiChatStatusBar } from "./ai-chat-status-bar"
import { AiChatThread } from "./ai-chat-thread"
import { QuietIconButton } from "./quiet-icon-button"

export function AiChatShell() {
  useAgentSession()
  const workspaceName = useChatStore((state) => state.workspaceName)
  const sessionTitle = useChatStore((state) => state.sessionTitle)
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "enjoy-agents-chat-split",
    storage: window.localStorage
  })

  return (
    <div className="flex h-full min-h-0 gap-3 bg-background-full p-3">
      <AiChatSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-3xl bg-background-primary-default shadow-card">
        <Group
          id="enjoy-agents-chat-split"
          orientation="horizontal"
          className="h-full min-w-0 flex-1 overflow-hidden"
          defaultLayout={defaultLayout}
          onLayoutChanged={onLayoutChanged}
        >
          <Panel id="chat" minSize="360px" defaultSize="62%">
            <main className="flex h-full min-h-0 min-w-0 flex-col">
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
              <AiChatThread />
              <AiChatComposer />
              <AiChatStatusBar />
            </main>
          </Panel>
          <Separator
            className="relative z-10 w-3 cursor-col-resize bg-transparent outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-separator-border hover:after:bg-accent-400 data-[active]:after:bg-accent-500"
          />
          <Panel id="changes" minSize="280px" defaultSize="38%">
            <AiChatChangesPanel />
          </Panel>
        </Group>
      </div>
      <AiChatKeysDialog />
    </div>
  )
}

export default function AiChatPage() {
  return <AiChatShell />
}
