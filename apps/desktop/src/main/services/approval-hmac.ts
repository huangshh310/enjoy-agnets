/**
 * 审批 HMAC：密钥只在 main 内存。落库后 decide 再验，篡改即拒。
 */
import { randomBytes } from "node:crypto"
import { approvalPayload, getApproval, insertApproval, setApprovalDecision, signApproval, verifyApproval } from "@enjoy-agents/db"
import { getDatabase } from "./database"

let processSecret: string | undefined

function approvalSecret(): string {
  processSecret ??= randomBytes(32).toString("hex")
  return processSecret
}

export function rememberApproval(input: {
  runId: string
  approvalId: string
  toolCallId: string
  name: string
  args: unknown
}): void {
  const payload = approvalPayload({
    runId: input.runId,
    toolCallId: input.toolCallId,
    approvalId: input.approvalId,
    name: input.name,
    args: input.args
  })
  insertApproval(getDatabase(), {
    id: input.approvalId,
    runId: input.runId,
    toolCallId: input.toolCallId,
    name: input.name,
    args: JSON.stringify(input.args ?? {}),
    hmac: signApproval(approvalSecret(), payload),
    decision: null,
    createdAt: Date.now()
  })
}

export function assertApprovalHmac(input: {
  runId: string
  approvalId: string
  toolCallId: string
}): void {
  const row = getApproval(getDatabase(), input.approvalId)
  if (!row) throw new Error("No matching tool approval is waiting.")
  if (row.runId !== input.runId || row.toolCallId !== input.toolCallId) {
    throw new Error("Approval token was tampered.")
  }
  let args: unknown = {}
  try {
    args = JSON.parse(row.args)
  } catch {
    args = row.args
  }
  const payload = approvalPayload({
    runId: row.runId,
    toolCallId: row.toolCallId,
    approvalId: row.id,
    name: row.name,
    args
  })
  if (!verifyApproval(approvalSecret(), payload, row.hmac)) {
    throw new Error("Approval token was tampered.")
  }
}

export function recordApprovalDecision(approvalId: string, decision: string): void {
  setApprovalDecision(getDatabase(), approvalId, decision)
}
