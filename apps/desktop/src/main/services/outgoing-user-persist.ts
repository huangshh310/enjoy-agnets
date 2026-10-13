/**
 * leo #148 M1：续跑 Todo 的内部提示永不当用户句落库。认显式标记 `todoContinue`，
 * 再兜底认文本（isTodoContinueUserMessage 会先剥 ACP 宿主模式围栏）。
 */
import { isTodoContinueUserMessage, type RunAgentInput } from "@enjoy-agents/ipc-contract"

export function shouldPersistOutgoingUser(input: RunAgentInput, persistUser: boolean): boolean {
  if (!persistUser || input.todoContinue === true) return false
  const lastUser = [...input.messages].reverse().find((message) => message.role === "user")
  if (!lastUser) return false
  return !isTodoContinueUserMessage(typeof lastUser.content === "string" ? lastUser.content : "")
}
