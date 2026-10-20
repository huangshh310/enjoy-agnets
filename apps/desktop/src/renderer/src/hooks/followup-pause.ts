/**
 * E1：什么时候停住排队、什么时候自己接着发（纯判定 + 事件挂钩）。
 * - 用户停止 → stopped；出错（出字前 / 出字后都算）→ error；402 / 额度 / 余额 → quota。
 * - 审批被拒「本次未执行」是用户自己的决定，不算出错，不停。
 * - 停着时，同一会话里有一轮正常跑完（run.end，比如失败卡上「再发一次」发出去了）：出错 / 额度的暂停自动解除，
 *   排队的按顺序接着发——失败那句先发，排队的跟在后面，不再倒序（#136 联动）。用户停止的暂停只认「继续」。
 */
import { isApprovalNotExecutedMessage } from "@enjoy-agents/ipc-contract/approval-not-executed"
import { isUserAbortEvent } from "@enjoy-agents/ipc-contract/desktop-notify"
import { classifyThreadError } from "../lib/usage/classify-thread-error"
import {
  followupPausedReason,
  pauseFollowups,
  resumeFollowups,
  type FollowupPausedReason
} from "./followup-queue"

/** 失败原因（错误码或文案）→ 暂停原因。 */
export function followupPauseReasonForFailure(message: string, code?: string | null): FollowupPausedReason {
  const kind = classifyThreadError(message, code)
  return kind === "provider_billing" || kind === "credit" ? "quota" : "error"
}

/** run.error → 暂停原因；不该停（审批被拒未执行）为 null。 */
export function followupPauseReasonForRunError(event: { message: string; code?: string }): FollowupPausedReason | null {
  if (isUserAbortEvent(event)) return "stopped"
  if (isApprovalNotExecutedMessage(event.message) || isApprovalNotExecutedMessage(event.code)) return null
  return followupPauseReasonForFailure(event.message, event.code)
}

/** 这种暂停在同会话一轮正常跑完后自动解除吗。 */
export function autoResumesAfterSuccess(reason: FollowupPausedReason | null): boolean {
  return reason === "error" || reason === "quota"
}

/**
 * 每个 agent 事件进 store / 停车前调用（前台、后台同一处，先停住再放 running=false，自启看不到空档）。
 * nonAgentRun：标题精炼之类的 completion，不算这一会话的一轮。
 */
export function noteFollowupRunEvent(
  sessionId: string | undefined,
  event: { type: string; message?: string; code?: string },
  nonAgentRun: boolean
): void {
  if (!sessionId || nonAgentRun) return
  if (event.type === "run.error") {
    const reason = followupPauseReasonForRunError({ message: event.message ?? "", code: event.code })
    if (reason) pauseFollowups(sessionId, reason)
    return
  }
  if (event.type === "run.end" && autoResumesAfterSuccess(followupPausedReason(sessionId))) {
    resumeFollowups(sessionId)
  }
}
