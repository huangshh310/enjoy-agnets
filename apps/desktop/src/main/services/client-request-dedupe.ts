/**
 * 同一会话同一 clientRequestId 在 60s 内不重写本轮。
 * 首字前失败回滚后，同 id 只回第一次的 runId；新 id 才算重试。
 */
import { CLIENT_REQUEST_DEDUP_MS } from "@enjoy-agents/ipc-contract/pre-output-failure"

type Receipt = { runId: string; at: number }

const receipts = new Map<string, Receipt>()

function keyOf(sessionId: string, clientRequestId: string): string {
  return `${sessionId}\0${clientRequestId}`
}

export function peekClientRequest(sessionId: string, clientRequestId: string, now = Date.now()): string | undefined {
  prune(now)
  const hit = receipts.get(keyOf(sessionId, clientRequestId))
  if (!hit) return undefined
  if (now - hit.at > CLIENT_REQUEST_DEDUP_MS) {
    receipts.delete(keyOf(sessionId, clientRequestId))
    return undefined
  }
  return hit.runId
}

export function rememberClientRequest(
  sessionId: string,
  clientRequestId: string,
  runId: string,
  now = Date.now()
): void {
  prune(now)
  receipts.set(keyOf(sessionId, clientRequestId), { runId, at: now })
}

export function resetClientRequestsForTest(): void {
  receipts.clear()
}

function prune(now: number): void {
  for (const [key, row] of receipts) {
    if (now - row.at > CLIENT_REQUEST_DEDUP_MS) receipts.delete(key)
  }
}
