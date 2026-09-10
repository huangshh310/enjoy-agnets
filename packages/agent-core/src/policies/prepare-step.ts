/**
 * ToolLoop prepareStep：每步先接纠偏、再裁历史。
 * SDK 7.x 会把这里返回的 messages 当作后续步的底本跨步保留。
 */
import { pruneModelMessages } from "../generation/prune.ts"
import type { ModelMessage } from "ai"

export type PrepareStepInput = {
  messages: ModelMessage[]
  stepNumber?: number
  /** 安全检查点注入的纠偏用户句；工具 execute 中途不会走到这里。 */
  injectUserMessages?: ModelMessage[]
}

/**
 * step 0 不 drain，避免首跳 LLM 前把纠偏 / 指令更新抽空却不注入。
 * 调用方按数组顺序拼接：项目指令更新在前，纠偏在后。
 */
export function pullPrepareStepUserMessages(
  stepNumber: number,
  pulls: ReadonlyArray<(() => ModelMessage[]) | undefined>
): ModelMessage[] | undefined {
  if (stepNumber <= 0) return undefined
  return pulls.flatMap((pull) => pull?.() ?? [])
}

/** 把纠偏句接到尾部；尾部已是同一批则不再接，避免与 run.messages 同引用时双写。 */
export function mergeSteeringMessages(
  messages: ModelMessage[],
  injected: ModelMessage[]
): ModelMessage[] {
  if (injected.length === 0) return messages
  if (tailMatchesInjected(messages, injected)) return messages
  return [...messages, ...injected]
}

/** 返回下一跳要用的 messages；SDK 会跨步保留这份数组。step 0 不接纠偏（须等工具结束）。 */
export async function prepareAgentStep(input: PrepareStepInput): Promise<{ messages: ModelMessage[] }> {
  const inject =
    (input.stepNumber ?? 0) > 0 ? (input.injectUserMessages ?? []) : []
  const merged = mergeSteeringMessages(input.messages, inject)
  return { messages: pruneModelMessages(merged) }
}

function tailMatchesInjected(messages: ModelMessage[], injected: ModelMessage[]): boolean {
  if (messages.length < injected.length) return false
  const tail = messages.slice(-injected.length)
  return tail.every((message, index) => {
    const left = userTextKey(message)
    const right = userTextKey(injected[index])
    return left !== undefined && left === right
  })
}

function userTextKey(message: ModelMessage | undefined): string | undefined {
  if (!message || message.role !== "user" || typeof message.content !== "string") return undefined
  return message.content
}

/** 传给 ToolLoop / streamText 的对象超时；数字会被 SDK 当成总超时而丢掉 stepMs。 */
export function agentLoopTimeout(input: { stepMs?: number; toolMs?: number }) {
  const stepMs = input.stepMs && input.stepMs > 0 ? input.stepMs : undefined
  const toolMs = input.toolMs && input.toolMs > 0 ? input.toolMs : undefined
  if (!stepMs && !toolMs) return undefined
  return { stepMs, toolMs }
}
