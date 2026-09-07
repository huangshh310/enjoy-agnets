/**
 * 把纠偏句接到当前 run。prepareStep 与泵收工共用，禁止两套物理。
 * 与 step.messages 同引用时的去重交给 prepareStep 的 mergeSteeringMessages。
 */
import type { ModelMessage } from "ai"
import { drainSteer, steerToModelMessages } from "./steering-queue.ts"

export type SteeringRun = {
  messages: ModelMessage[]
  input: { sessionId: string }
}

/** drain 会话队列，接到 run.messages。返回这次新句给 prepareStep。 */
export function absorbSteeringMessages(run: SteeringRun): ModelMessage[] {
  const extra = steerToModelMessages(drainSteer(run.input.sessionId))
  if (extra.length > 0) run.messages.push(...extra)
  return extra
}

/** 收工前还有未注入的引导时，同 run 再开一轮 ToolLoop。 */
export function absorbSteering(run: SteeringRun): boolean {
  return absorbSteeringMessages(run).length > 0
}
