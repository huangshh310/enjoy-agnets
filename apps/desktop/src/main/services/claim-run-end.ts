/**
 * 一轮终态：只有 Agent 宣称收工才发 run.end。
 * 用户取消 / 超时 / 已标 cancelled 不得再宣称收工，避免挤进待验收。
 */

/** Inbox 失败筛靠 message 里的 abort 识别「已取消」。通知层用同一常量认「已停止」。 */
export { USER_ABORT_MESSAGE } from "@enjoy-agents/ipc-contract/desktop-notify"

export function shouldEmitRunEnd(input: {
  aborted: boolean
  timedOut: boolean
  userCancelled?: boolean
}): boolean {
  return !input.aborted && !input.timedOut && !input.userCancelled
}
