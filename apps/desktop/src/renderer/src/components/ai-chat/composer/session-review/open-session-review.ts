/**
 * 从改动条打开右栏审查：作用域必须能列出条上的文件。
 */
import { revealRightPane } from "@renderer/components/ai-chat/right-pane/open-pane"
import { pathsFromLastTurn } from "@renderer/components/ai-chat/right-pane/views/review/last-turn-paths"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { useChatStore } from "@renderer/stores/chat-store"
import { useRightPaneStore } from "@renderer/stores/right-pane-store"
import { reviewScopeForSession } from "./review-scope-for-session"

export function openSessionReview(path?: string) {
  const store = useChatStore.getState()
  const lastTurnCount = pathsFromLastTurn(store.messages).length
  useRightPaneStore.getState().setReviewScope(
    reviewScopeForSession({ lastTurnCount, dirtyCount: store.changes.length })
  )
  revealRightPane("review")
  if (path) void openChangedFile(path)
}
