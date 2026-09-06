/**
 * 从改动条打开右栏审查：作用域必须能列出条上的文件。
 */
import { revealRightPane } from "@renderer/components/ai-chat/right-pane/open-pane"
import { pathsFromLastTurn } from "@renderer/components/ai-chat/right-pane/views/review/last-turn-paths"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { useChatStore } from "@renderer/stores/chat-store"
import { useRightPaneStore } from "@renderer/stores/right-pane-store"
import { reviewScopeForLastTurnCount } from "./review-scope-for-session"

export function openSessionReview(path?: string) {
  const count = pathsFromLastTurn(useChatStore.getState().messages).length
  useRightPaneStore.getState().setReviewScope(reviewScopeForLastTurnCount(count))
  revealRightPane("review")
  if (path) void openChangedFile(path)
}
