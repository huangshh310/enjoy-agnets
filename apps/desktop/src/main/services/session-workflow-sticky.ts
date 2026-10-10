/**
 * needs_review 粘性：开跑 / 只读收工不得擦掉，只等人通过或打回。
 */
import type { TurnOutcome } from "@enjoy-agents/ipc-contract"

export function shouldWriteSessionWorkflow(
  current: string | null | undefined,
  next: TurnOutcome["workflow"]
): boolean {
  return !(current === "needs_review" && (next === "in_progress" || next === "todo"))
}
