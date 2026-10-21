/**
 * 「已收到，它下一步就会看到。」（runtimeHint = steered）什么时候自己收掉（mike P3，#163 巡检 46–52：只能点 × 才会关）。
 * - 这一轮结束（不再 running）：「它下一步就会看到」已经不成立；
 * - 之后又发出了一句（对话里的用户消息比提示出现时多）；
 * - 提示出现满 30 秒。
 * 只收 steered 这一种；排队类提示（queued / chipQueued / imageSteerQueued）不动。
 */
import { getRuntimeHint, setRuntimeHint, type RuntimeHintCode } from "../followup-queue"

export const STEERED_HINT_MAX_MS = 30_000

export function steeredHintExpired(input: {
  hint: RuntimeHintCode
  running: boolean
  /** 提示出现那一刻对话里的用户消息条数（含刚插进去的那句）。 */
  userCountAtShow: number
  userCount: number
  elapsedMs: number
}): boolean {
  if (input.hint !== "steered") return false
  if (!input.running) return true
  if (input.userCount > input.userCountAtShow) return true
  return input.elapsedMs >= STEERED_HINT_MAX_MS
}

/**
 * 提示还挂着时，同一轮里对话又多了用户消息：跑着的时候普通发送只会进排队、不会进对话，
 * 所以这一定是又插了一句（输入框 Ctrl+Enter 或排队行「马上发给它」）——「已收到」重新算 30 秒，不是收掉（leo #170 soft-1）。
 * 换了一轮（runId 变了）才算「之后又发出了一句」。
 */
export function steeredHintRestarted(input: {
  hint: RuntimeHintCode
  running: boolean
  userCountAtShow: number
  userCount: number
  runIdAtShow: string | null
  runId: string | null
}): boolean {
  if (input.hint !== "steered" || !input.running) return false
  return input.userCount > input.userCountAtShow && input.runId === input.runIdAtShow
}

/** 只在当前提示仍是 steered 时清掉，别把随后换上的排队提示一起清了。 */
export function clearSteeredHint(): boolean {
  if (getRuntimeHint() !== "steered") return false
  setRuntimeHint(null)
  return true
}

export function countUserMessages(messages: ReadonlyArray<{ role: string }>): number {
  let n = 0
  for (const message of messages) if (message.role === "user") n += 1
  return n
}
