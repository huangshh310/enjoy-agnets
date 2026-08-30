"use client"

import { RiClipboardLine, RiThumbDownLine, RiThumbUpLine } from "@remixicon/react"
import { AgentThinking } from "@/components/application/agent-thinking/agent-thinking"
import { Button } from "@/components/base/buttons/button"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
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
    <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-8 py-6">
      {messages.length === 0 && !running ? (
        <p className="text-body-medium text-text-tertiary">Ask the agent to inspect or change this workspace.</p>
      ) : null}
      {messages.map((message) =>
        message.role === "user" ? (
          <div key={message.id} className="flex justify-end">
            <div className="max-w-[min(22rem,78%)] rounded-2xl bg-background-tertiary-default px-3.5 py-2.5 text-body-medium text-text-primary">
              {message.content}
            </div>
          </div>
        ) : (
          <article key={message.id} className="flex max-w-[40rem] flex-col gap-3">
            <p className="text-body-medium text-text-primary">{message.content}</p>
            {message.attachment ? <AiChatCodeBlock attachment={message.attachment} /> : null}
            <div className="-ml-1 flex items-center">
              <QuietIconButton icon={RiThumbUpLine} aria-label="Good response" />
              <QuietIconButton icon={RiThumbDownLine} aria-label="Bad response" />
              <QuietIconButton
                icon={RiClipboardLine}
                aria-label="Copy response"
                onClick={() => navigator.clipboard.writeText(message.content)}
              />
            </div>
          </article>
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
            <Button size="small" variant="primary" onClick={onApprove}>
              Allow
            </Button>
            <Button size="small" variant="secondary" onClick={onAllowSession}>
              Allow for session
            </Button>
            <Button size="small" variant="danger" onClick={onDeny}>
              Deny
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className={cx("text-body-medium text-text-error-primary")}>{error}</p> : null}
    </div>
  )
}
