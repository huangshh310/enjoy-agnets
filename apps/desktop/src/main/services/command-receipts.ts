/**
 * commandId 收据：同一 command 重试返回第一次的 runId，不双开 turn。
 */
const receipts = new Map<string, string>()

export function peekCommandReceipt(commandId: string): string | undefined {
  return receipts.get(commandId)
}

export function rememberCommandReceipt(commandId: string, runId: string): void {
  if (!receipts.has(commandId)) receipts.set(commandId, runId)
}

/** 测试用。 */
export function resetCommandReceipts(): void {
  receipts.clear()
}
