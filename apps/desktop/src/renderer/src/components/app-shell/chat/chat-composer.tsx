/**
 * Chat 输入框接线：空态与线程底部共用一份，避免两份 props 拷贝。
 */
import { AiChatComposer } from "@renderer/components/ai-chat/ai-chat-composer"
import { abortComposerRun, attachComposerFile, submitComposer } from "@renderer/hooks/use-agent-session"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { markUserSend, userSendQueues } from "@renderer/components/ai-chat/thread/scroll-on-send"

/** 用户自己点的发送 / 插话：记一笔，对话只为这种发送贴底（排队自动发出、重来不拽，leo #170 soft-2）。 */
function noteUserSend(requested: "send" | "steer") {
  const { running, sessionId } = useChatStore.getState()
  if (!userSendQueues(running, requested)) markUserSend(sessionId)
}

export function ChatComposer({
  className,
  autoFocus = false,
  onModelChange,
  onSend
}: {
  className?: string
  autoFocus?: boolean
  onModelChange: (model: ModelOption) => void
  onSend: () => void
}) {
  const composer = useChatStore((state) => state.composer)
  const setComposer = useChatStore((state) => state.setComposer)
  const running = useChatStore((state) => state.running)
  const modelLabel = useChatStore((state) => state.modelLabel)
  const modelId = useChatStore((state) => state.modelId)
  const models = useChatStore((state) => state.models)

  return (
    <AiChatComposer
      composer={composer}
      onComposerChange={setComposer}
      running={running}
      modelLabel={modelLabel}
      modelId={modelId}
      models={models}
      onModelChange={onModelChange}
      onSend={() => {
        noteUserSend("send")
        onSend()
      }}
      onSteer={() => {
        noteUserSend("steer")
        void submitComposer("steer")
      }}
      onStop={() => void abortComposerRun()}
      onAttach={(file) => void attachComposerFile(file)}
      className={className}
      autoFocus={autoFocus}
    />
  )
}
