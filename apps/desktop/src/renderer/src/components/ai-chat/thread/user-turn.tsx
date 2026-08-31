/**
 * 用户一轮：附件 + 气泡 + 右对齐复制。
 */
import { Message, MessageActions, MessageContent } from "@/components/ai-elements/message"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { AssetPreview } from "./asset-preview"
import { CopyMessageButton } from "./copy-message-button"

export function UserTurn({ message }: { message: ThreadMessage }) {
  const canCopy = Boolean(message.content.trim() || message.assets?.length)
  return (
    <Message from="user" className="ml-auto flex max-w-[min(26rem,85%)] flex-col items-end gap-1.5">
      {message.assets && message.assets.length > 0 ? (
        <AssetPreview assets={message.assets} align="end" />
      ) : null}
      {message.content ? <MessageContent>{message.content}</MessageContent> : null}
      {canCopy ? (
        <MessageActions className="-mr-1 justify-end">
          <CopyMessageButton message={message} />
        </MessageActions>
      ) : null}
    </Message>
  )
}
