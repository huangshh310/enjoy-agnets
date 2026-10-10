/**
 * 一轮收工判定：main 在 run.end / run.error 上算一次，renderer 只消费。
 * 写类名走 `isWriteTypeToolName`（只读白名单之外都算可能改盘）。
 */
import { z } from "zod"
import { isToolNotExecuted } from "./approval-not-executed.ts"
import { isWriteTypeToolName } from "./tool-names.ts"

export const TurnWorkflow = z.enum(["todo", "in_progress", "needs_review"])
export type TurnWorkflow = z.infer<typeof TurnWorkflow>

/** complete=已完成；error=出错/已停止；neutral=全未执行，不弹完成。 */
export const TurnAttention = z.enum(["complete", "error", "neutral"])
export type TurnAttention = z.infer<typeof TurnAttention>

export const TurnOutcome = z.object({
  workflow: TurnWorkflow,
  attention: TurnAttention
})
export type TurnOutcome = z.infer<typeof TurnOutcome>

export type TurnToolSnapshot = {
  name: string
  state?: string
  result?: unknown
  errorText?: string
}

export type DecideTurnInput = {
  ended: "end" | "error" | "abort"
  tools: readonly TurnToolSnapshot[]
}

const SEALED_ERROR = "No result received."

/** 与 renderer `finalizeRun` 对齐：未发出结果的 input-* 封成 output-error。 */
export function sealTurnTools<T extends TurnToolSnapshot>(tools: readonly T[]): T[] {
  return tools.map((tool) => {
    if (tool.state !== "input-streaming" && tool.state !== "input-available") return tool
    return { ...tool, state: "output-error", errorText: tool.errorText ?? SEALED_ERROR }
  })
}

/**
 * 出错 / 用户停：Attention 仍是出错/已停止；若写类已开始执行则工单进待验收。
 * 全拒绝或从未发出：回待办、Attention 中性。
 * 只读轮：回待办，Attention 仍可完成。
 * 写类已执行或执行中被掐（封成 output-error）：待验收 + 完成。
 */
export function decideTurnOutcome(input: DecideTurnInput): TurnOutcome {
  const tools = sealTurnTools(input.tools)
  const acted = tools.filter((tool) => tool.state !== "approval-requested" && !isToolNotExecuted(tool))
  const wrote = acted.some((tool) => isWriteTypeToolName(tool.name))
  if (input.ended === "error" || input.ended === "abort") {
    return { workflow: wrote ? "needs_review" : "in_progress", attention: "error" }
  }
  if (tools.length === 0) return { workflow: "todo", attention: "complete" }
  if (acted.length === 0) return { workflow: "todo", attention: "neutral" }
  if (wrote) return { workflow: "needs_review", attention: "complete" }
  return { workflow: "todo", attention: "complete" }
}
