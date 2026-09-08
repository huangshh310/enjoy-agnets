/**
 * 会话引擎交接 brief：只存系统/隐藏上下文，消费一次后删除。
 * 禁止写成用户气泡或 annotated user turn。
 */
import { SetHandoffInput } from "@enjoy-agents/ipc-contract"
import { getSetting, setSetting } from "./database"
import { parseHandoffs, type HandoffRecord } from "./session-handoff-parse.ts"

export { parseHandoffs, prependHandoffHistory } from "./session-handoff-parse.ts"

const KEY = "session.handoffs"

export function writeSessionHandoff(input: SetHandoffInput): void {
  const parsed = SetHandoffInput.parse(input)
  const all = parseHandoffs(getSetting(KEY))
  all[parsed.sessionId] = parsed
  setSetting(KEY, JSON.stringify(all))
}

/** 取出并删除；开流只注入一次。 */
export function takeSessionHandoff(sessionId: string): HandoffRecord | null {
  const all = parseHandoffs(getSetting(KEY))
  const taken = all[sessionId] ?? null
  if (!taken) return null
  delete all[sessionId]
  setSetting(KEY, JSON.stringify(all))
  return taken
}
