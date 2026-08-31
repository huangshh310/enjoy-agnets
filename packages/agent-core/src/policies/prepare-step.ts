/**
 * ToolLoop prepareStep：每步先裁历史，再把 step 超时预算交给 SDK timeout.stepMs。
 */
import { pruneModelMessages } from "../generation/prune.ts"
import type { ModelMessage } from "ai"

export type PrepareStepInput = {
  messages: ModelMessage[]
  stepNumber?: number
}

/** 返回下一跳要用的 messages；过长会话先 clip + prune。 */
export async function prepareAgentStep(input: PrepareStepInput): Promise<{ messages: ModelMessage[] }> {
  return { messages: pruneModelMessages(input.messages) }
}

/** 传给 ToolLoop / streamText 的对象超时；数字会被 SDK 当成总超时而丢掉 stepMs。 */
export function agentLoopTimeout(input: { stepMs?: number; toolMs?: number }) {
  const stepMs = input.stepMs && input.stepMs > 0 ? input.stepMs : undefined
  const toolMs = input.toolMs && input.toolMs > 0 ? input.toolMs : undefined
  if (!stepMs && !toolMs) return undefined
  return { stepMs, toolMs }
}
