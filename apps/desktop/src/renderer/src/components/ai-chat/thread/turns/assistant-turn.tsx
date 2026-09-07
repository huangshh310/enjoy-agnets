/**
 * 助手一轮回复：Thinking 树；折叠外的 Todo / File Diff / Tool Result；生图走 Image Generation。
 */
import { ImageGeneration } from "@/components/ai-elements/image-generation"
import { VideoGeneration } from "./video-generating"
import { Message, MessageContent } from "@/components/ai-elements/message"
import { stripEnjoyActionsBlock } from "@enjoy-agents/ipc-contract"
import { resolveTurnKind } from "@renderer/hooks/resolve-turn-kind"
import { shouldShowThinkingTrace } from "@renderer/hooks/thinking-visibility"
import { usePrecedingUserPrompt } from "@renderer/hooks/preceding-user-prompt"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { AiChatCodeBlock } from "../../ai-chat-code-block"
import { AssistantActions } from "./assistant-actions"
import { MessageActionChips } from "./message-action-chips"
import { MarkdownResponse } from "../markdown-response"
import { ThinkingTrace } from "../thinking/thinking-trace"
import { TurnExtras } from "./turn-extras"
import { TurnToolSurfaces } from "../tool-surfaces/turn-tool-surfaces"
import { hasTurnToolSurfaces } from "../tool-surfaces/select-turn-tool-surfaces"

export function AssistantTurn({ message }: { message: ThreadMessage }) {
  const prompt = usePrecedingUserPrompt(message.id)
  const surface = assistantSurface(message)

  return (
    <Message from="assistant" id={message.id} data-thread-message={message.id} className="max-w-[40rem]">
      {surface.showThinking ? (
        <ThinkingTrace
          reasoning={surface.reasoning}
          tools={surface.tools}
          streaming={Boolean(message.streaming)}
          startedAt={message.createdAt}
          thoughtSeconds={message.thoughtSeconds}
        />
      ) : null}
      {surface.hasToolSurfaces ? <TurnToolSurfaces tools={surface.tools} /> : null}
      {surface.showGenerating ? (
        <MessageContent>
          {surface.turnKind === "video" ? (
            <VideoGeneration prompt={prompt} />
          ) : (
            <ImageGeneration status="generating" prompt={prompt} className="w-80 max-w-full" />
          )}
        </MessageContent>
      ) : null}

      {surface.hasBody ? (
        <MessageContent>
          <MarkdownResponse>{stripEnjoyActionsBlock(message.content)}</MarkdownResponse>
          {message.attachment ? <AiChatCodeBlock attachment={message.attachment} /> : null}
          <TurnExtras message={message} prompt={prompt} />
        </MessageContent>
      ) : null}

      {!message.streaming && message.actionChips?.length ? (
        <MessageActionChips chips={message.actionChips} />
      ) : null}
      {!message.streaming && surface.hasBody ? <AssistantActions message={message} prompt={prompt} /> : null}
    </Message>
  )
}

function assistantSurface(message: ThreadMessage) {
  const turnKind = resolveTurnKind(message)
  const reasoning = message.reasoning?.trim() ?? ""
  const tools = message.tools ?? []
  const hasExtras =
    Boolean(message.sources?.length) ||
    Boolean(message.assets?.length) ||
    Boolean(message.components?.length) ||
    message.structured != null
  return {
    reasoning,
    tools,
    showThinking: shouldShowThinkingTrace({
      reasoning,
      toolCount: tools.length,
      streaming: Boolean(message.streaming),
      mediaSurface: turnKind !== "agent"
    }),
    hasToolSurfaces: hasTurnToolSurfaces(tools),
    hasBody: Boolean(message.content.trim()) || Boolean(message.attachment) || hasExtras,
    turnKind,
    showGenerating:
      Boolean(message.streaming) &&
      !hasExtras &&
      !message.content.trim() &&
      (turnKind === "image" || turnKind === "video")
  }
}
