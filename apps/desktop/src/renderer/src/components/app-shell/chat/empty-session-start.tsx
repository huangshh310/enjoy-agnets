/**
 * 空会话开始面：问候。Composer 由 ChatThreadBody 单实例挂载，不在这里再造一份。
 */
import { AiChatEmptyState } from "@renderer/components/ai-chat/empty-state/ai-chat-empty-state"
import { ThreadErrorBanner } from "@renderer/components/ai-chat/thread/thread-error-banner"
import { ThreadNoticeBanner } from "@renderer/components/ai-chat/thread/thread-notice-banner"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"

export function EmptySessionStart(props: {
  workspaceName: string
  sessionTitle: string
  workspaceRootLabel: string
  changesCount: number
  onModelChange?: (model: ModelOption) => void
  onSend?: () => void
}) {
  void props.onModelChange
  void props.onSend
  const error = useChatStore((state) => state.error)

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-4">
      <AiChatEmptyState
        workspaceName={props.workspaceName}
        sessionTitle={props.sessionTitle}
        workspaceRootLabel={props.workspaceRootLabel}
        changesCount={props.changesCount}
      />
      <ThreadNoticeBanner />
      {error ? <ThreadErrorBanner error={error} className="my-0 w-full max-w-none" /> : null}
    </div>
  )
}
