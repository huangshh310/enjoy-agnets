/**
 * 开跑：挂内存 run 与落外发用户句必须一起成或一起退（leo 小修 2）。
 * 用户句 id 若已落在别的会话，persistMessage 抛 MESSAGE_ID_SESSION_MISMATCH；
 * 不撤 run 会让本会话永远报 RUN_ACTIVE。先预检，挂上之后再失败就撤掉 run 并回稳定码。
 */
import { MESSAGE_ID_SESSION_MISMATCH } from "@enjoy-agents/ipc-contract/session-truncate"
import { deleteActiveRun, holdAgentRun } from "./agent-run-state"
import { messageIdBelongsToOtherSession } from "./persist-session"

export type HoldWithUserResult = { ok: true } | { ok: false; code: typeof MESSAGE_ID_SESSION_MISMATCH }

/** 开跑前预检：要落的用户句 id 已属别的会话就别开跑。 */
export function outgoingUserIdConflict(sessionId: string, messageId: string | undefined): boolean {
  return Boolean(messageId) && messageIdBelongsToOtherSession(sessionId, messageId as string)
}

function isMismatch(error: unknown): boolean {
  return error instanceof Error && error.message === MESSAGE_ID_SESSION_MISMATCH
}

export function holdRunThenPersistUser(
  hold: Parameters<typeof holdAgentRun>[0],
  persistUser: () => void
): HoldWithUserResult {
  holdAgentRun(hold)
  try {
    persistUser()
    return { ok: true }
  } catch (error) {
    deleteActiveRun(hold.runId)
    if (isMismatch(error)) return { ok: false, code: MESSAGE_ID_SESSION_MISMATCH }
    throw error
  }
}
