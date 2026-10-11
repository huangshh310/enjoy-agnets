/**
 * regenerate / edit-and-resend / rewind 开截前：读库尾，把视图尾巴对成库 id 名单（见 reconcileTailWithDb）。
 * 对不上返回 null：调用方刷新视图、提示「有新内容」，不截断。
 */
import { getIde } from "../lib/ide"
import { reconcileTailWithDb, type TailRow } from "./session-truncate-intent"

export async function resolveTruncateTail(input: {
  sessionId: string
  messages: ReadonlyArray<TailRow>
  anchorId: string
  mode: "after" | "from"
}): Promise<string[] | null> {
  let rows: TailRow[]
  try {
    rows = (await getIde().session.messages({ sessionId: input.sessionId })) as TailRow[]
  } catch {
    return null
  }
  return reconcileTailWithDb({
    view: input.messages.map((row) => ({ id: row.id, role: row.role, content: row.content })),
    db: rows.map((row) => ({ id: row.id, role: row.role, content: row.content })),
    anchorId: input.anchorId,
    mode: input.mode
  })
}
