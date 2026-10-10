/**
 * 空会话开始面：问候 → Composer → 示例 pill。垂直居中，Composer 不进 empty-state。
 */
import { AiChatEmptyState } from "@renderer/components/ai-chat/empty-state/ai-chat-empty-state"
import { EmptyStatePills } from "@renderer/components/ai-chat/empty-state/empty-state-pills"
import { focusComposerEnd } from "@renderer/components/ai-chat/empty-state/focus-composer"
import { ThreadErrorBanner } from "@renderer/components/ai-chat/thread/thread-error-banner"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { ChatComposerCluster } from "./chat-composer-cluster"

export function EmptySessionStart(props: {
  workspaceName: string
  sessionTitle: string
  workspaceRootLabel: string
  changesCount: number
  onModelChange: (model: ModelOption) => void
  onSend: () => void
}) {
  const setComposer = useChatStore((state) => state.setComposer)
  const error = useChatStore((state) => state.error)

  function handleSelect(promptText: string) {
    setComposer(promptText)
    focusComposerEnd(promptText)
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex min-h-full w-full flex-col items-center justify-center px-6 py-8">
        <div className="flex w-full max-w-3xl flex-col items-center gap-6 animate-in fade-in-50 duration-300">
          <AiChatEmptyState
            workspaceName={props.workspaceName}
            sessionTitle={props.sessionTitle}
            workspaceRootLabel={props.workspaceRootLabel}
            changesCount={props.changesCount}
          />
          <div className="flex w-full flex-col items-center gap-4">
            {error ? <ThreadErrorBanner error={error} className="my-0 w-full max-w-none" /> : null}
            <ChatComposerCluster
              className="w-full shrink-0"
              composerClassName="px-0 pb-2 [&_textarea]:min-h-[72px]"
              autoFocus
              onModelChange={props.onModelChange}
              onSend={props.onSend}
            />
            <EmptyStatePills onSelectPrompt={handleSelect} />
          </div>
        </div>
      </div>
    </div>
  )
}
