"use client"

import { RiClipboardLine, RiThumbDownLine, RiThumbUpLine } from "@remixicon/react"
import { AgentThinking } from "@/components/application/agent-thinking/agent-thinking"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent
} from "@/components/ai-elements/message"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { AiChatCodeBlock } from "./ai-chat-code-block"

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
  return (
    <Conversation className="min-h-0">
      <ConversationContent className="gap-8 px-8 py-6">
        {messages.length === 0 && !running ? (
          <p className="text-body-medium text-text-tertiary">
            Ask the agent to inspect or change this workspace.
          </p>
        ) : null}
        {messages.map((message) =>
          message.role === "user" ? (
            <Message key={message.id} from="user" className="max-w-[min(22rem,78%)]">
              <MessageContent>{message.content}</MessageContent>
            </Message>
          ) : (
            <Message key={message.id} from="assistant" className="max-w-[40rem]">
              <MessageContent>
                {message.content}
                {message.attachment ? <AiChatCodeBlock attachment={message.attachment} /> : null}
              </MessageContent>
              <MessageActions className="-ml-1">
                <MessageAction tooltip="Good response" label="Good response">
                  <RiThumbUpLine className="size-4" />
                </MessageAction>
                <MessageAction tooltip="Bad response" label="Bad response">
                  <RiThumbDownLine className="size-4" />
                </MessageAction>
                <MessageAction
                  tooltip="Copy response"
                  label="Copy response"
                  onClick={() => navigator.clipboard.writeText(message.content)}
                >
                  <RiClipboardLine className="size-4" />
                </MessageAction>
              </MessageActions>
            </Message>
          )
        )}

        {running && !pendingApproval ? <AgentThinking variant="infinity" label={thinkingLabel} /> : null}

        {pendingApproval ? (
          <div className="rounded-2xl border border-border-button-default bg-background-secondary-default p-4">
            <p className="text-body-medium text-text-primary">
              Approve {pendingApproval.name} before the agent continues.
            </p>
            <pre className="mt-2 overflow-x-auto text-caption-1-medium text-text-secondary">
              {JSON.stringify(pendingApproval.args, null, 2)}
            </pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={onApprove}>
                Allow
              </Button>
              <Button size="sm" variant="outline" onClick={onAllowSession}>
                Allow for session
              </Button>
              <Button size="sm" variant="destructive" onClick={onDeny}>
                Deny
              </Button>
            </div>
          </div>
        ) : null}

        {error ? <p className={cx("text-body-medium text-text-error-primary")}>{error}</p> : null}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}
