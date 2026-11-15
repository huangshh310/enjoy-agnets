/**
 * renderer 只读 main 挂在 run.end / run.error 上的 turn；没有字段才回落旧逻辑。
 */
import type { StreamEvent, TurnOutcome } from "@enjoy-agents/ipc-contract"

export function turnFromEvent(event: StreamEvent): TurnOutcome | undefined {
  if (event.type === "run.end" || event.type === "run.error") return event.turn
  // E1 M2：有在途工具的停止由 run.stopped 终态带回收工判定（stuck 不带）。
  if (event.type === "run.stopped") return event.turn
  return undefined
}

export function omitCompleteFromTurn(event: StreamEvent, fallbackDeniedOnly: boolean): boolean {
  const turn = turnFromEvent(event)
  if (turn) return turn.attention === "neutral" || turn.attention === "stopped"
  return event.type === "run.end" && fallbackDeniedOnly
}
