"use client"

import { useState } from "react"
import { LoadingState } from "@/components/ai-elements/loading-state"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton
} from "@/components/ai-elements/conversation"
import { cx } from "@/utils/cx"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { ApprovalCard } from "./thread/approval-card"
import { AssistantTurn } from "./thread/turns/assistant-turn"
import { UserTurn } from "./thread/turns/user-turn"
import { visibleThreadMessages } from "./thread/orphan-extract-turn"

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
  onApprove: () => void
  onDeny: () => void
  onAllowSession: () => void
}) {
  const visible = visibleThreadMessages(messages)
  const last = visible.at(-1)
  const showPlaceholder = running && !pendingApproval && last?.role !== "assistant"

  return (
    <Conversation className="min-h-0">
      <ConversationContent className="gap-8 px-8 py-6">

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

        {error ? <p className={cx("text-body-medium text-text-error-primary")}>{error}</p> : null}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}

function ThreadLoadingPlaceholder({ label }: { label: string }) {
  const [startedAt] = useState(() => Date.now())
  return <LoadingState variant="drive" label={label} startedAt={startedAt} />
}
