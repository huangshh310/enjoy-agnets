"use client"

import { AgentThinking } from "@/components/application/agent-thinking/agent-thinking"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton
} from "@/components/ai-elements/conversation"
import { cx } from "@/utils/cx"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { ApprovalCard } from "./thread/approval-card"
import { AssistantTurn } from "./thread/assistant-turn"
import { UserTurn } from "./thread/user-turn"
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
        {messages.length === 0 && !running ? (
          <ConversationEmptyState
            title="Ask the agent"
            description="Inspect files, edit the workspace, or run a plan against this folder."
            className="min-h-48 text-text-tertiary"
          />
        ) : null}

        {visible.map((message) =>
          message.role === "user" ? (
            <UserTurn key={message.id} message={message} />
          ) : (
            <AssistantTurn key={message.id} message={message} />
          )
        )}

        {showPlaceholder ? <AgentThinking variant="infinity" label={thinkingLabel} /> : null}

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
