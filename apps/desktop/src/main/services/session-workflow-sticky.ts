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

/** main 把粘性工单回填进 turn，renderer 才能看见 needs_review。 */
export function stickyTurnOutcome(
  computed: TurnOutcome,
  current: string | null | undefined
): TurnOutcome {
  if (!shouldWriteSessionWorkflow(current, computed.workflow) && current === "needs_review") {
    return { ...computed, workflow: "needs_review" }
  }
  return computed
}
