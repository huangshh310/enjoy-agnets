/**
 * 助手轮操作：赞踩、Extract、复制。生图轮必须有可见反馈，不能静默 return。
 */
import { useState } from "react"
import {
  RiBracesLine,
  RiRefreshLine,
  RiThumbDownLine,
  RiThumbUpLine
} from "@remixicon/react"
import { extractObjectFromMessage } from "@renderer/hooks/extract-object"
import { regenerateAssistantTurn } from "@renderer/hooks/regenerate-turn"
import { useChatStore, type ThreadMessage } from "@renderer/stores/chat-store"
import { MessageAction, MessageActions } from "@/components/ai-elements/message"
import { CopyMessageButton } from "../copy-message-button"
import { useT } from "@renderer/i18n"

export function AssistantActions({
  message,
  prompt
}: {
  message: ThreadMessage
  prompt?: string
}) {
  const t = useT()
  const [extracting, setExtracting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const running = useChatStore((s) => s.running)
  const vote = message.feedback

  return (
    <MessageActions className="-ml-1">
      <MessageAction
        tooltip={t("chat.goodResponse")}
        label={t("chat.goodResponse")}
        aria-pressed={vote === "up"}
        onClick={() => setTurnFeedback(message.id, "up")}
        className={vote === "up" ? "text-accent-500" : undefined}
      >
        <RiThumbUpLine className="size-4" />
      </MessageAction>
      <MessageAction
        tooltip={t("chat.badResponse")}
        label={t("chat.badResponse")}
        aria-pressed={vote === "down"}
        onClick={() => setTurnFeedback(message.id, "down")}
        className={vote === "down" ? "text-accent-500" : undefined}
      >
        <RiThumbDownLine className="size-4" />
      </MessageAction>
      <MessageAction
        tooltip={extracting ? t("chat.extracting") : t("chat.extractObject")}
        label={t("chat.extractObject")}
        disabled={extracting}
        aria-busy={extracting}
        className={extracting ? "opacity-50" : undefined}
        onClick={() => {
          setExtracting(true)
          void extractObjectFromMessage(message.id, prompt).finally(() => setExtracting(false))
        }}
      >
        <RiBracesLine className="size-4" />
      </MessageAction>
      <MessageAction
        tooltip={regenerating ? t("chat.regenerating") : t("chat.regenerate")}
        label={t("chat.regenerate")}
        disabled={running || regenerating}
        onClick={() => {
          setRegenerating(true)
          void regenerateAssistantTurn(message.id).finally(() => setRegenerating(false))
        }}
      >
        <RiRefreshLine className="size-4" />
      </MessageAction>
      <CopyMessageButton message={message} prompt={prompt} label={t("chat.copyResponse")} />
    </MessageActions>
  )
}

function setTurnFeedback(messageId: string, vote: "up" | "down") {
  const store = useChatStore.getState()
  store.setMessages(
    store.messages.map((item) =>
      item.id === messageId
        ? { ...item, feedback: item.feedback === vote ? undefined : vote }
        : item
    )
  )
}
