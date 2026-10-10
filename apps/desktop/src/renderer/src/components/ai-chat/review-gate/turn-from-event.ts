/**
 * renderer 只读 main 挂在 run.end / run.error 上的 turn；没有字段才回落旧逻辑。
 */
import type { StreamEvent, TurnOutcome } from "@enjoy-agents/ipc-contract"

export function turnFromEvent(event: StreamEvent): TurnOutcome | undefined {
  if (event.type === "run.end" || event.type === "run.error") return event.turn
  return undefined
}

export function omitCompleteFromTurn(event: StreamEvent, fallbackDeniedOnly: boolean): boolean {
  const turn = turnFromEvent(event)
  if (turn) return turn.attention === "neutral" || turn.attention === "stopped"
  return event.type === "run.end" && fallbackDeniedOnly
}
