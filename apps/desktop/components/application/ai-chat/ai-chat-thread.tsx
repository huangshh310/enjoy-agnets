"use client"

import { RiClipboardLine, RiThumbDownLine, RiThumbUpLine } from "@remixicon/react"
import { AgentThinking } from "@/components/application/agent-thinking/agent-thinking"
import { cx } from "@/utils/cx"
import { useChatStore } from "@renderer/stores/chat-store"
import { AiChatCodeBlock } from "./ai-chat-code-block"
import { QuietIconButton } from "./quiet-icon-button"

export function AiChatThread() {
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const thinkingLabel = useChatStore((state) => state.thinkingLabel)
  const error = useChatStore((state) => state.error)
  const pendingApproval = useChatStore((state) => state.pendingApproval)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-8 py-6">
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

      {running ? <AgentThinking variant="infinity" label={thinkingLabel} /> : null}

      {pendingApproval ? (
        <div className="rounded-2xl border border-border-button-default bg-background-secondary-default p-4">
          <p className="text-body-medium text-text-primary">
            Approve {pendingApproval.name} before the agent continues.
          </p>
          <pre className="mt-2 overflow-x-auto text-caption-1-medium text-text-secondary">
            {JSON.stringify(pendingApproval.args, null, 2)}
          </pre>
        </div>
      ) : null}

      {error ? <p className={cx("text-body-medium text-text-error-primary")}>{error}</p> : null}
    </div>
  )
}
