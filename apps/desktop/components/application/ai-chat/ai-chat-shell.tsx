"use client"

import { RiFolder6Line, RiMoreLine } from "@remixicon/react"
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

  return (
    <div className="flex h-full min-h-0 gap-3 bg-background-full p-3">
      <AiChatSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-3xl bg-background-primary-default shadow-card">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
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
        <AiChatChangesPanel />
      </div>
      <AiChatKeysDialog />
    </div>
  )
}

export default function AiChatPage() {
  return <AiChatShell />
}
