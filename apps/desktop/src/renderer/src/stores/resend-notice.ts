/**
 * 连不上白卡点「再发一次」：结果回来前同一张卡留着（按钮「正在发送…」禁用）。
 * 出字或 run.end 才收；再失败由失败路径换回同一条码。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { isProviderUnreachable } from "../lib/send-gate-codes.ts"
import { lastTurnHasNoOutput } from "./pre-output-rollback.ts"
import type { ThreadMessage } from "./chat-store.types.ts"

const OUTPUT_EVENTS = new Set<StreamEvent["type"]>([
  "text.delta",
  "reasoning.delta",
  "tool.start",
  "approval.required",
  "asset.created",
  "structured.delta",
  "realtime.text",
  "mcp.app"
])

/** 乐观气泡入列时：连不上的卡不清。 */
export function errorAfterOptimisticSend(current: string | null): string | null {
  return current && isProviderUnreachable(current) ? current : null
}

/** 流事件折叠后该写的 error；undefined 表示不动。 */
export function errorAfterStreamEvent(
  current: string | null,
  event: StreamEvent,
  patchError: string | null | undefined
): string | null | undefined {
  if (!current || !isProviderUnreachable(current)) return patchError
  if (event.type === "run.start" && patchError === null) return undefined
  if (patchError === undefined && OUTPUT_EVENTS.has(event.type)) return null
  return patchError
}

/**
 * 空会话里再发：结果回来前别从开始面换到线程面，否则卡会被卸掉重挂（不是同一张）。
 * 只认「只有这一轮乐观句、还没出字」。
 */
export function holdEmptyForResend(
  messages: ThreadMessage[],
  running: boolean,
  error: string | null
): boolean {
  if (!running || !error || !isProviderUnreachable(error)) return false
  if (messages.length === 0) return true
  const users = messages.filter((message) => message.role === "user").length
  return users === 1 && messages.length <= 2 && lastTurnHasNoOutput(messages)
}
