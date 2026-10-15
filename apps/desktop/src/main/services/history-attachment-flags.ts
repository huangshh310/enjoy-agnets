/**
 * leo（#155 @6d7ce465）：给历史标上「这条用户句带附件」，toModelMessages 据此决定只图轮要不要占位。
 * 历史轮看库里 message_parts 有没有 file part；本轮（最后一条用户句）看 input.attachments。
 */
import { getDatabase } from "./database"
import type { HistoryMessage } from "./to-model-messages"

export function userIdsWithFiles(sessionId: string): Set<string> {
  const rows = getDatabase()
    .prepare(
      `SELECT DISTINCT p.message_id AS id FROM message_parts p
       JOIN messages m ON m.id = p.message_id
       WHERE m.session_id = ? AND m.role = 'user' AND p.type = 'file'`
    )
    .all(sessionId) as Array<{ id: string }>
  return new Set(rows.map((row) => row.id))
}

export function withAttachmentFlags<T extends HistoryMessage & { id?: string }>(
  messages: readonly T[],
  withFiles: ReadonlySet<string>,
  currentAttachmentCount: number
): T[] {
  const lastIndex = messages.length - 1
  return messages.map((message, index) => {
    if (message.role !== "user") return message
    const current = index === lastIndex && currentAttachmentCount > 0
    const stored = Boolean(message.id && withFiles.has(message.id))
    return current || stored ? { ...message, hasAttachments: true } : message
  })
}
