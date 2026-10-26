/**
 * Composer 簇：空会话时 PermissionDock 贴 Composer 顶边。
 * 有消息时 Dock 挂在对话列底部（chat-stage），可被压、卡内滚，永不占 Composer 的高度。
 * 不要钉在 Conversation 顶，也不进会话滚动区。
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
  /** 有消息时 Dock 由对话列承载，这里不再画。 */
  dock?: boolean
}) {
  return (
    <div className={cx("flex shrink-0 flex-col", props.className)} data-toast-clearance="">
      {props.dock === false ? null : <PermissionDock />}
      {/* 有消息时（dock=false）簇不加左右内边距、Composer 自己带 px-6：提示跟着让出来，和输入框里的字对齐。 */}
      <ComposerPreparingHint composerFramed={props.dock === false} />
      <ChatComposer
        className={props.composerClassName}
        autoFocus={props.autoFocus}
        onModelChange={props.onModelChange}
        onSend={props.onSend}
      />
    </div>
  )
}
