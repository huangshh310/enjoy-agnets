/**
 * 助手一轮回复：Thinking 头始终保留，结束后不卸掉。
 */
import { ImageGeneration } from "@/components/ai-elements/image-generation"
import { RiBracesLine, RiClipboardLine, RiThumbDownLine, RiThumbUpLine } from "@remixicon/react"
import { extractObjectFromMessage } from "@renderer/hooks/extract-object"
import { useComposerRunKind, usePrecedingUserPrompt } from "@renderer/hooks/preceding-user-prompt"
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
import { TurnExtras } from "./turn-extras"

export function AssistantTurn({ message }: { message: ThreadMessage }) {
  const prompt = usePrecedingUserPrompt(message.id)
  const imageRun = useComposerRunKind() === "image"
  const reasoning = message.reasoning?.trim() ?? ""
  const tools = message.tools ?? []
  const hasExtras =
    Boolean(message.sources?.length) ||
    Boolean(message.assets?.length) ||
    Boolean(message.components?.length) ||
    message.structured != null
  const hasBody = Boolean(message.content.trim()) || Boolean(message.attachment) || hasExtras
  const showGenerating = Boolean(message.streaming) && !hasExtras && !message.content.trim() && imageRun

  return (
    <Message from="assistant" className="max-w-[40rem]">
      <ThinkingTrace
        reasoning={reasoning}
        tools={tools}
        streaming={Boolean(message.streaming)}
        startedAt={message.createdAt}
        thoughtSeconds={message.thoughtSeconds}
      />

      {showGenerating ? (
        <MessageContent>
          <ImageGeneration status="generating" prompt={prompt} className="w-80 max-w-full" />
        </MessageContent>
      ) : null}

      {hasBody ? (
        <MessageContent>
          <MarkdownResponse>{message.content}</MarkdownResponse>
          {message.attachment ? <AiChatCodeBlock attachment={message.attachment} /> : null}
          <TurnExtras message={message} prompt={prompt} />
        </MessageContent>
      ) : null}

      {!message.streaming && hasBody ? <AssistantActions message={message} /> : null}
    </Message>
  )
}

function AssistantActions({ message }: { message: ThreadMessage }) {
  return (
    <MessageActions className="-ml-1">
      <MessageAction tooltip="Good response" label="Good response">
        <RiThumbUpLine className="size-4" />
      </MessageAction>
      <MessageAction tooltip="Bad response" label="Bad response">
        <RiThumbDownLine className="size-4" />
      </MessageAction>
      <MessageAction
        tooltip="Extract object"
        label="Extract object"
        onClick={() => void extractObjectFromMessage(message.id)}
      >
        <RiBracesLine className="size-4" />
      </MessageAction>
      <MessageAction
        tooltip="Copy response"
        label="Copy response"
        onClick={() => navigator.clipboard.writeText(message.content)}
      >
        <RiClipboardLine className="size-4" />
      </MessageAction>
    </MessageActions>
  )
}
