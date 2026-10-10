/**
 * Composer 簇：PermissionDock 夹在会话内容与 Composer 之间，
 * 贴 Composer 顶边。不要钉在 Conversation 顶，也不进会话滚动区。
 */
import { cx } from "@/utils/cx"
import { PermissionDock } from "@renderer/components/ai-chat/attention/permission-dock"
import type { ModelOption } from "@renderer/stores/chat-store"
import { ChatComposer } from "./chat-composer"
import { ComposerPreparingHint } from "./composer-preparing-hint"

export function ChatComposerCluster(props: {
  className?: string
  composerClassName?: string
  autoFocus?: boolean
  onModelChange: (model: ModelOption) => void
  onSend: () => void
}) {
  return (
    <div className={cx("flex shrink-0 flex-col", props.className)} data-toast-clearance="">
      <PermissionDock />
      <ComposerPreparingHint />
      <ChatComposer
        className={props.composerClassName}
        autoFocus={props.autoFocus}
        onModelChange={props.onModelChange}
        onSend={props.onSend}
      />
    </div>
  )
}
