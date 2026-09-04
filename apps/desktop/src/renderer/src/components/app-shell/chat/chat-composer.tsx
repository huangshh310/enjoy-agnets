/**
 * Chat 输入框接线：空态与线程底部共用一份，避免两份 props 拷贝。
 */
import { AiChatComposer } from "@renderer/components/ai-chat/ai-chat-composer"
import { abortComposerRun, attachComposerFile } from "@renderer/hooks/use-agent-session"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"

export function ChatComposer({
  className,
  onModelChange,
  onSend
}: {
  className?: string
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
      onSend={onSend}
      onStop={() => void abortComposerRun()}
      onAttach={(file) => void attachComposerFile(file)}
      className={className}
    />
  )
}
