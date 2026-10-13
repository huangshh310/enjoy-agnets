/**
 * leo #148 M1：续跑 Todo 的内部提示永不当用户句落库 / 回显。
 * `todoContinue` 标记 fail-closed：只有**标记 + 最后一条用户句确是续跑提示**（剥 ACP 宿主模式围栏后匹配）
 * 才算内部轮；标记单独出现一律忽略，普通句照常落库。
 */
import { isTodoContinueUserMessage, type RunAgentInput } from "@enjoy-agents/ipc-contract"

function lastUserText(input: RunAgentInput): string | undefined {
  const lastUser = [...input.messages].reverse().find((message) => message.role === "user")
  if (!lastUser) return undefined
  return typeof lastUser.content === "string" ? lastUser.content : ""
}

/** 唯一判定：这一轮的最后一条用户句是内部续跑提示。 */
export function isInternalTodoContinueTurn(input: RunAgentInput): boolean {
  return input.todoContinue === true && isTodoContinueUserMessage(lastUserText(input))
}

export function shouldPersistOutgoingUser(input: RunAgentInput, persistUser: boolean): boolean {
  if (!persistUser) return false
  const text = lastUserText(input)
  if (text === undefined) return false
  // leo #148 三轮：不做纯文本兜底——没标记就照常落库，与回显同一判定。
  return !isInternalTodoContinueTurn(input)
}

/** runAgent → beginAgentRun 的落库开关：只看调用方 persistUser，标记不单独压掉。 */
export function runAgentPersistUser(input: RunAgentInput): boolean {
  return input.persistUser !== false
}
