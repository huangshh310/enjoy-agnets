/**
 * 一轮 consume 结束后：等人审批、再泵一轮、还是收工。
 * 同一条 stream 里工具已经 output-available，不要只因为点过 Allow 再开一轮 ToolLoop。
 */
export type PumpAfterConsume = "park" | "continue" | "complete"

export type ToolEndState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "output-available"
  | "output-error"
  | "output-denied"

export function decideAfterConsume(input: {
  pendingCount: number
  resumeAfterPump: boolean
  lastToolState?: ToolEndState
}): PumpAfterConsume {
  if (input.pendingCount > 0) return "park"
  if (!input.resumeAfterPump) return "complete"
  // 审批后工具已在本轮跑完：再泵会重复打模型，容易 429。
  if (input.lastToolState === "output-available") return "complete"
  return "continue"
}
