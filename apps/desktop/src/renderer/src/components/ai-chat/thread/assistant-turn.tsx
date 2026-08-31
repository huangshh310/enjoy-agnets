/**
 * 助手一轮回复：Thinking 头始终保留，结束后不卸掉。
 */
import { RiClipboardLine, RiThumbDownLine, RiThumbUpLine } from "@remixicon/react"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent
} from "@/components/ai-elements/message"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { AiChatCodeBlock } from "../ai-chat-code-block"
import { MarkdownResponse } from "./markdown-response"
import { ThinkingTrace } from "./thinking-trace"

export function AssistantTurn({ message }: { message: ThreadMessage }) {
  const reasoning = message.reasoning?.trim() ?? ""
  const tools = message.tools ?? []
  const hasBody = Boolean(message.content.trim()) || Boolean(message.attachment)

  return (
    <Message from="assistant" className="max-w-[40rem]">
      <ThinkingTrace
        reasoning={reasoning}
        tools={tools}
        streaming={Boolean(message.streaming)}
        startedAt={message.createdAt}
        thoughtSeconds={message.thoughtSeconds}
      />

      {hasBody ? (
        <MessageContent>
          <MarkdownResponse>{message.content}</MarkdownResponse>
          {message.attachment ? <AiChatCodeBlock attachment={message.attachment} /> : null}
        </MessageContent>
      ) : null}

      {!message.streaming && hasBody ? (
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
      ) : null}
    </Message>
  )
}
