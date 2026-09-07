/**
 * 排队自启：idle 后取出下一项再开 agent.run。
 * 必须订阅队列本身；只听 running 边沿时，已 idle 再入队会卡住。
 */
import type { FollowupItem } from "./followup-queue.ts"
import { takeNextFollowup } from "./followup-queue.ts"

let inFlight = false

/** 测试用：放开 inFlight，避免用例互相卡住。 */
export function resetFollowupAutostart() {
  inFlight = false
}

/** 尝试取出并发送下一项。已在跑、审批等待或正在发送则跳过。 */
export function tryStartNextFollowup(input: {
  sessionId: string | null | undefined
  running: boolean
  /** waiting_review 时不要自启，避免审批卡片还在就开下一轮。 */
  pendingApproval?: boolean
  send: (item: FollowupItem) => Promise<void>
}): boolean {
  if (input.running || input.pendingApproval || !input.sessionId || inFlight) return false
  const next = takeNextFollowup(input.sessionId)
  if (!next) return false
  inFlight = true
  void input.send(next).finally(() => {
    inFlight = false
  })
  return true
}
