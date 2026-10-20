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

/**
 * leo BLOCK #163 ③：这一发没发出去（看门狗、闸拦、regenerate / 继续 Todo 起跑抛错）——排队的先停住，
 * 不然 running 一落，排在后面的 B 抢在退回输入框的 A 前面发出去。原因按错误码分，认不出来一律当「出错」。
 */
export function pauseFollowupsAfterFailedStart(sessionId: string | null | undefined, reason?: string | null): void {
  pauseFollowups(sessionId, followupPauseReasonForFailure(reason ?? ""))
}

/** run.error → 暂停原因；不该停（审批被拒未执行）为 null。 */
export function followupPauseReasonForRunError(event: { message: string; code?: string }): FollowupPausedReason | null {
  if (isUserAbortEvent(event)) return "stopped"
  if (isApprovalNotExecutedMessage(event.message) || isApprovalNotExecutedMessage(event.code)) return null
  return followupPauseReasonForFailure(event.message, event.code)
}

/** 中性（灰色）的暂停：用户自己停的（点停止 / 换助手）。出错、额度用完是琥珀色。 */
export function isNeutralPause(reason: FollowupPausedReason | null): boolean {
  return reason === "stopped" || reason === "engineSwitched"
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
