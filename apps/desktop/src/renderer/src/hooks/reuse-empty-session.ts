/**
 * 当前空会话复用：连点「新对话」或空会话上按 Enter 不叠空会话。
 * 不删、不回收存量空会话（BASE-P0-3 草稿落库 / 启动回收归 kai）。
 */
import { isDefaultSessionTitle } from "../lib/session-title"
import { listComposerAssets } from "./composer-assets"
import type { ChatStore } from "../stores/chat-store.types"

export function isReusableEmptySession(
  store: Pick<ChatStore, "sessionId" | "workspaceId" | "sessionTitle" | "messages">,
  workspaceId: string
): boolean {
  if (!store.sessionId || store.workspaceId !== workspaceId) return false
  if (!isDefaultSessionTitle(store.sessionTitle)) return false
  if (store.messages.some((item) => item.role === "user")) return false
  return listComposerAssets().length === 0
}
