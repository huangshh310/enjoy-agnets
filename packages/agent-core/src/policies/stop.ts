/**
 * ToolLoop 停止条件：步数上限走 SDK stepCountIs，并可叠加 hasToolCall。
 * isLoopFinished 在 ai@7.0.84 是恒 false，仍挂上以免漏官方组合点。
 */
import { hasToolCall, isLoopFinished, stepCountIs } from "ai"

export function clampAgentSteps(maxSteps?: number): number {
  if (!maxSteps || !Number.isFinite(maxSteps)) return 20
  return Math.min(64, Math.max(1, Math.floor(maxSteps)))
}

export type AgentStopOptions = {
  maxSteps?: number
  /** 调用这些工具名之后停（SDK hasToolCall）。 */
  stopAfterTools?: string[]
}

/** 返回 SDK 可接受的 stopWhen 数组。 */
export function agentStopWhen(maxStepsOrOptions?: number | AgentStopOptions) {
  const options =
    typeof maxStepsOrOptions === "number" || maxStepsOrOptions === undefined
      ? { maxSteps: maxStepsOrOptions }
      : maxStepsOrOptions
  const conditions = [stepCountIs(clampAgentSteps(options.maxSteps)), isLoopFinished()]
  if (options.stopAfterTools?.length) {
    return [...conditions, hasToolCall(...options.stopAfterTools)]
  }
  return conditions
}
