/**
 * 审批行：HMAC 存库，decide 时再验，篡改即失效。
 */
import type { AppDatabase } from "../client"

export type ApprovalRow = {
  id: string
  runId: string
  toolCallId: string
  name: string
  args: string
  hmac: string
  decision: string | null
  createdAt: number
}

/** 同一未决行幂等复用；已决或身份不同则换新 id，禁止把真冲突当成功。 */
export function nextApprovalId(
  existing: Pick<ApprovalRow, "id" | "runId" | "toolCallId" | "decision"> | undefined,
  incoming: Pick<ApprovalRow, "id" | "runId" | "toolCallId">,
  allocate: () => string
): { id: string; action: "insert" | "reuse" } {
  if (!existing) return { id: incoming.id, action: "insert" }
  if (
    existing.decision == null &&
    existing.runId === incoming.runId &&
    existing.toolCallId === incoming.toolCallId
  ) {
    return { id: existing.id, action: "reuse" }
  }
  return { id: allocate(), action: "insert" }
}

export function insertApproval(db: AppDatabase, row: ApprovalRow): void {
  db.prepare(
    `INSERT INTO approvals (id, run_id, tool_call_id, name, args, hmac, decision, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.runId,
    row.toolCallId,
    row.name,
    row.args,
    row.hmac,
    row.decision,
    row.createdAt
  )
}

export function getApproval(db: AppDatabase, id: string): ApprovalRow | undefined {
  return db
    .prepare(
      `SELECT id, run_id as runId, tool_call_id as toolCallId, name, args, hmac, decision,
              created_at as createdAt
       FROM approvals WHERE id = ?`
    )
    .get(id) as ApprovalRow | undefined
}

export function setApprovalDecision(db: AppDatabase, id: string, decision: string): void {
  db.prepare("UPDATE approvals SET decision = ? WHERE id = ?").run(decision, id)
}

export function listPendingApprovals(db: AppDatabase, runId?: string): ApprovalRow[] {
  const rows = db
    .prepare(
      `SELECT id, run_id as runId, tool_call_id as toolCallId, name, args, hmac, decision,
              created_at as createdAt
       FROM approvals WHERE decision IS NULL`
    )
    .all() as ApprovalRow[]
  return runId ? rows.filter((row) => row.runId === runId) : rows
}
