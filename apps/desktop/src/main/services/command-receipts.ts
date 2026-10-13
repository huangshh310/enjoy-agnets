/**
 * commandId 收据：同一 command 重试返回第一次的 runId，不双开 turn。
 */
export type CommandReceipt = { runId: string; userMessageId?: string }

const receipts = new Map<string, CommandReceipt>()

/** leo：带上第一次落库的用户句 id，重试也能让 renderer 清掉 main 的稿。 */
export function peekCommandReceipt(commandId: string): CommandReceipt | undefined {
  return receipts.get(commandId)
}

export function rememberCommandReceipt(commandId: string, runId: string, userMessageId?: string): void {
  if (!receipts.has(commandId)) receipts.set(commandId, userMessageId ? { runId, userMessageId } : { runId })
}

/** 测试用。 */
export function resetCommandReceipts(): void {
  receipts.clear()
}
