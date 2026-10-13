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
import { laterTurnCount } from "@renderer/hooks/regenerate-retry-target"
import { RegenerateConfirmDialog } from "./regenerate-confirm-dialog"
import { useChatStore, type ThreadMessage } from "@renderer/stores/chat-store"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { MessageAction, MessageActions } from "@/components/ai-elements/message"
import { CopyMessageButton } from "../copy-message-button"
import { canForkTurn, ForkTurnButton } from "./fork-turn-button"
import { MessageMoreMenu } from "./message-more-menu"
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
  const laterTurns = useChatStore((s) => laterTurnCount(s.messages, message.id))
  const [confirmOpen, setConfirmOpen] = useState(false)
  const vote = message.feedback
  const regenerate = () => {
    setRegenerating(true)
    void regenerateAssistantTurn(message.id).finally(() => setRegenerating(false))
  }

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
        tooltip={regenerating ? t("chat.regenerating") : t("chat.regenerate")}
        label={t("chat.regenerate")}
        disabled={running || regenerating}
        onClick={() => {
          // 不是最后一条：先确认后面几轮会删掉（jojo P1）。
          if (laterTurns > 0) setConfirmOpen(true)
          else regenerate()
        }}
      >
        <RiRefreshLine className="size-4" />
      </MessageAction>
      <RegenerateConfirmDialog
        open={confirmOpen}
        laterTurns={laterTurns}
        onConfirm={regenerate}
        onOpenChange={setConfirmOpen}
      />
      <CopyMessageButton message={message} prompt={prompt} label={t("chat.copyResponse")} />
      {canForkTurn(message) ? <ForkTurnButton messageId={message.id} /> : null}
      <MessageMoreMenu>
        <DropdownMenuItem
          data-testid="extract-object"
          disabled={extracting}
          onClick={() => {
            setExtracting(true)
            void extractObjectFromMessage(message.id, prompt).finally(() => setExtracting(false))
          }}
          className="flex cursor-pointer items-center gap-2 py-1.5 px-2 text-caption-1-medium"
        >
          <RiBracesLine className="size-4 shrink-0" />
          <span>{extracting ? t("chat.extracting") : t("chat.viewRawJson")}</span>
        </DropdownMenuItem>
      </MessageMoreMenu>
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
