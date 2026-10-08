/**
 * 历史落到空的新聊天或空项目。只清前台会话，不写数据库。
 */
import { useEngineHandoffStore } from "@renderer/components/ai-chat/agent-picker/handoff/engine-handoff-store"
import { clearComposerAssets } from "@renderer/hooks/composer-assets"
import { setQuotedContexts } from "@renderer/hooks/quoted-context"
import { parkForegroundRun, saveCurrentSessionDraft } from "@renderer/hooks/session-lifecycle"
import { idleComposerPatch } from "@renderer/stores/attention/session-run-park"
import { useChatStore } from "@renderer/stores/chat-store"

export function showEmptyHistoryChat(): void {
  const store = useChatStore.getState()
  if (store.sessionId) {
    parkForegroundRun()
    saveCurrentSessionDraft()
  }
  useEngineHandoffStore.getState().resetPending()
  useChatStore.setState({
    ...idleComposerPatch(),
    sessionId: null,
    messages: [],
    sessionTitle: "新对话",
    composer: ""
  })
  clearComposerAssets()
  setQuotedContexts([])
}
