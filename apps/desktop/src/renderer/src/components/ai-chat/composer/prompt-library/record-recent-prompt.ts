/**
 * Should：发送成功乐观落用户气泡后，upsert「近期」进提示收藏薄库。
 * fire-and-forget；失败静默。
 */
import { getIde, hasIde } from "@renderer/lib/ide"
import { visibleUserText } from "@renderer/lib/user-message-text"

export function recordRecentPrompt(content: string): void {
  if (!hasIde()) return
  const text = visibleUserText(content)
  if (!text) return
  void getIde().settings.upsertRecentPrompt({ text }).catch(() => undefined)
}
