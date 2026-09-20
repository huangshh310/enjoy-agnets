/**
 * 会话引擎交接 brief：只存系统/隐藏上下文，消费一次后删除。
 * 禁止写成用户气泡或 annotated user turn。
 */
import { SetHandoffInput } from "@enjoy-agents/ipc-contract"
import { getSetting, setSetting } from "./database"
import { consumeHandoff, parseHandoffs, peekHandoff, type HandoffRecord } from "./session-handoff-parse.ts"
import { clearAcpSessionBind } from "./acp-session-bind.ts"

export { parseHandoffs, prependHandoffHistory } from "./session-handoff-parse.ts"

const KEY = "session.handoffs"

export function writeSessionHandoff(input: SetHandoffInput): void {
  const parsed = SetHandoffInput.parse(input)
  const all = parseHandoffs(getSetting(KEY))
  all[parsed.sessionId] = parsed
  setSetting(KEY, JSON.stringify(all))
  clearAcpSessionBind(parsed.sessionId)
}

/** 只读；开流失败必须还能再注入。 */
export function peekSessionHandoff(sessionId: string): HandoffRecord | null {
  return peekHandoff(parseHandoffs(getSetting(KEY)), sessionId)
}

/** 模型已经吃到 brief 之后才删。 */
export function takeSessionHandoff(sessionId: string): HandoffRecord | null {
  const { taken, next } = consumeHandoff(parseHandoffs(getSetting(KEY)), sessionId)
  if (!taken) return null
  setSetting(KEY, JSON.stringify(next))
  return taken
}
