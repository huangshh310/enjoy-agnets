/**
 * 用户消息轮次组件：
 * 包含附件预览、气泡内容、右对齐操作栏（复制、就地编辑与重新发送）。
 */
import { useEffect, useRef, useState } from "react"
import {
  RiCheckLine,
  RiEditLine,
  RiLoader4Line
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Message, MessageAction, MessageActions, MessageContent } from "@/components/ai-elements/message"
import { editAndResendUserTurn } from "@renderer/hooks/regenerate-turn"
import { useChatStore, type ThreadMessage } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { AssetPreview } from "../asset-preview"
import { CopyMessageButton } from "../copy-message-button"

export function UserTurn({ message }: { message: ThreadMessage }) {
  const t = useT()
  const [isEditing, setIsEditing] = useState(false)
  const [draftContent, setDraftContent] = useState(message.content)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const running = useChatStore((s) => s.running)

  useEffect(() => {
    setDraftContent(message.content)
  }, [message.content])

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus()
      textareaRef.current?.select()
    }
  }, [isEditing])

  async function handleSaveAndResend() {
    if (!draftContent.trim() || isSubmitting || running) return
    setIsSubmitting(true)
    try {
      await editAndResendUserTurn(message.id, draftContent)
      setIsEditing(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      void handleSaveAndResend()
    } else if (e.key === "Escape") {
      setIsEditing(false)
      setDraftContent(message.content)
    }
  }

  const canCopy = Boolean(message.content.trim() || message.assets?.length)

  return (
    <Message
      from="user"
      id={message.id}
      data-thread-message={message.id}
      className="ml-auto flex max-w-[min(32rem,88%)] flex-col items-end gap-1.5"
    >
      {message.assets && message.assets.length > 0 ? (
        <AssetPreview assets={message.assets} align="end" />
      ) : null}

      {isEditing ? (
        <div className="flex w-full flex-col gap-2 rounded-2xl border border-separator-border/80 bg-background-primary-default p-3 shadow-md">
          <textarea
            ref={textareaRef}
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={Math.min(Math.max(draftContent.split("\n").length, 2), 8)}
            className="w-full resize-none bg-transparent font-sans text-caption-1-medium text-text-primary focus-visible:outline-none leading-relaxed"
            placeholder={t("chat.editPlaceholder")}
          />

          <div className="flex items-center justify-between border-t border-separator-border/40 pt-2 text-[11px]">
            <span className="text-text-tertiary font-mono text-[10px]">
              {t("chat.editHint")}
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => {
                  setIsEditing(false)
                  setDraftContent(message.content)
                }}
                className="h-6.5 px-2 text-caption-2-medium"
              >
                {t("common.cancel")}
              </Button>

              <Button
                size="sm"
                disabled={!draftContent.trim() || isSubmitting || running}
                onClick={() => void handleSaveAndResend()}
                className="gap-1 h-6.5 px-2.5 text-caption-2-medium shadow-xs"
              >
                {isSubmitting ? (
                  <RiLoader4Line className="size-3 animate-spin" />
                ) : (
                  <RiCheckLine className="size-3" />
                )}
                <span>{t("chat.saveResend")}</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {message.content ? <MessageContent>{message.content}</MessageContent> : null}

          <MessageActions className="-mr-1 justify-end">
            {!running ? (
              <MessageAction
                tooltip={t("chat.editMessage")}
                label={t("chat.editMessage")}
                onClick={() => setIsEditing(true)}
              >
                <RiEditLine className="size-3.5" />
              </MessageAction>
            ) : null}

            {canCopy ? <CopyMessageButton message={message} /> : null}
          </MessageActions>
        </>
      )}
    </Message>
  )
}
