"use client"

import { useState } from "react"
import { LoadingState } from "@/components/ai-elements/loading-state"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton
} from "@/components/ai-elements/conversation"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import type { AskUserAnswers, StreamEvent } from "@enjoy-agents/ipc-contract"
import { ApprovalCard } from "./thread/approval/approval-card"
import { AssistantTurn } from "./thread/turns/assistant-turn"
import { UserTurn } from "./thread/turns/user-turn"
import { visibleThreadMessages } from "./thread/orphan-extract-turn"
import { ThreadErrorBanner } from "./thread/thread-error-banner"
import { ThreadPreviewRail } from "./thread/thread-preview-rail"

export function AiChatThread({
  messages,
  running,
  thinkingLabel,
  error,
  pendingApproval,
  onApprove,
  onDeny,
  onAllowSession
}: {
  messages: ThreadMessage[]
  running: boolean
  thinkingLabel: string
  error: string | null
  pendingApproval: (StreamEvent & { type: "approval.required" }) | null
  onApprove: (answers?: AskUserAnswers) => void
  onDeny: () => void
  onAllowSession: () => void
}) {
  const visible = visibleThreadMessages(messages)
  const last = visible.at(-1)
  const showPlaceholder = running && !pendingApproval && last?.role !== "assistant"

  return (
    <div className="relative flex min-h-0 flex-1 flex-col animate-in fade-in-50 duration-300">
      <Conversation className="min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&>div]:[scrollbar-width:none] [&>div::-webkit-scrollbar]:hidden">
        <ConversationContent className="gap-8 px-8 py-6 pr-16">
          {visible.map((message) =>
            message.role === "user" ? (
              <UserTurn key={message.id} message={message} />
            ) : (
              <AssistantTurn key={message.id} message={message} />
            )
          )}

          {showPlaceholder ? <ThreadLoadingPlaceholder label={thinkingLabel} /> : null}

          {pendingApproval ? (
            <ApprovalCard
              pending={pendingApproval}
              onApprove={onApprove}
              onDeny={onDeny}
              onAllowSession={onAllowSession}
            />
          ) : null}

          {error ? <ThreadErrorBanner error={error} /> : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <ThreadPreviewRail messages={visible} />
    </div>
  )
}

function ThreadLoadingPlaceholder({ label }: { label: string }) {
  const [startedAt] = useState(() => Date.now())
  return <LoadingState variant="drive" label={label} startedAt={startedAt} />
}
