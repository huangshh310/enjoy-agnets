/**
 * Composer 簇：PermissionDock 夹在会话内容与 Composer 之间，
 * 贴 Composer 顶边。不要钉在 Conversation 顶，也不进会话滚动区。
 */
import { PermissionDock } from "@renderer/components/attention/permission-dock"
import type { ModelOption } from "@renderer/stores/chat-store"
import { ChatComposer } from "./chat-composer"

export function ChatComposerCluster(props: {
  className?: string
  onModelChange: (model: ModelOption) => void
  onSend: () => void
}) {
  return (
    <div className="flex shrink-0 flex-col">
      <PermissionDock />
      <ChatComposer
        className={props.className}
        onModelChange={props.onModelChange}
        onSend={props.onSend}
      />
    </div>
  )
}
