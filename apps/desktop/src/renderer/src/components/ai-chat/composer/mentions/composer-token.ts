/**
 * Composer 里正在打的 @ 文件引用或句首 / 命令。
 * @ 可出现在任意词首；/ 只认整段或换行后的句首，避免句子中间的路径被当成命令。
 */

export type MentionKind = "at" | "slash"

export type ActiveMention = {
  kind: MentionKind
  query: string
  start: number
  end: number
}

const AT_TOKEN = /(^|[\s])@([^\s]*)$/
const SLASH_TOKEN = /(^|\n)\/([^\s]*)$/

/** 光标左侧若落在未写完的 @ 或句首 / 上，就打开对应面板。 */
export function detectActiveMention(text: string, cursor: number): ActiveMention | null {
  const end = clampCursor(text, cursor)
  const prefix = text.slice(0, end)
  const at = prefix.match(AT_TOKEN)
  if (at?.index !== undefined) {
    const start = at.index + at[1]!.length
    return { kind: "at", query: at[2] ?? "", start, end }
  }
  const slash = prefix.match(SLASH_TOKEN)
  if (slash?.index !== undefined) {
    const start = slash.index + slash[1]!.length
    return { kind: "slash", query: slash[2] ?? "", start, end }
  }
  return null
}

/** 选中面板项后剥掉 @foo / /plan，可选择插入替补文本。 */
export function replaceMentionToken(text: string, mention: ActiveMention, insert = ""): string {
  const before = text.slice(0, mention.start)
  const after = text.slice(mention.end)
  if (!insert) return `${before}${after}`
  const glued = before.endsWith(" ") || before.length === 0 ? insert : ` ${insert}`
  return `${before}${glued}${after}`
}

/**
 * 选中是异步的（读文件进引用要走 IPC）：等它回来时输入框里可能已经接着打了字。
 * 只剥掉当初那段 @token，按输入框当下全文替换，禁止拿按键时的旧稿整段覆盖。
 */
export function replaceMentionTokenLive(
  stale: string,
  live: string,
  mention: ActiveMention,
  insert = ""
): string {
  const token = stale.slice(mention.start, mention.end)
  if (!token) return live
  if (live.slice(mention.start, mention.end) === token) return replaceMentionToken(live, mention, insert)
  const start = live.lastIndexOf(token)
  if (start < 0) return live
  return replaceMentionToken(live, { ...mention, start, end: start + token.length }, insert)
}

function clampCursor(text: string, cursor: number): number {
  if (!Number.isFinite(cursor) || cursor < 0) return 0
  return Math.min(Math.floor(cursor), text.length)
}
