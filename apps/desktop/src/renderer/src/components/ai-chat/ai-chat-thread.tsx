"use client"

import { AgentThinking } from "@/components/application/agent-thinking/agent-thinking"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton
} from "@/components/ai-elements/conversation"
import { Message, MessageContent } from "@/components/ai-elements/message"
import { cx } from "@/utils/cx"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { ApprovalCard } from "./thread/approval-card"
import { AssetPreview } from "./thread/asset-preview"
import { AssistantTurn } from "./thread/assistant-turn"

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
  const last = messages.at(-1)
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

        {messages.map((message) =>
          message.role === "user" ? (
            <Message key={message.id} from="user" className="max-w-[min(24rem,80%)] flex flex-col items-end gap-1.5">
              {message.assets && message.assets.length > 0 ? (
                <div className="w-full">
                  <AssetPreview assets={message.assets} />
                </div>
              ) : null}
              {message.content ? <MessageContent>{message.content}</MessageContent> : null}
            </Message>
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
