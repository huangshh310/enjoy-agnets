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

export type NextApprovalId =
  | { id: string; action: "insert" }
  | { id: string; action: "reuse" }
  | { id: string; action: "decided" }

export type RememberApprovalPlan =
  | { id: string; action: "insert" }
  | { id: string; action: "reuse" }
  | { id: string; action: "replay"; decision: string }
  | { id: string; action: "fail_closed"; decision: string }

/** 同一未决行幂等复用；已决且身份相同保留原 id；身份不同才换新。 */
export function nextApprovalId(
  existing: Pick<ApprovalRow, "id" | "runId" | "toolCallId" | "decision"> | undefined,
  incoming: Pick<ApprovalRow, "id" | "runId" | "toolCallId">,
  allocate: () => string
): NextApprovalId {
  if (!existing) return { id: incoming.id, action: "insert" }
  if (existing.runId !== incoming.runId || existing.toolCallId !== incoming.toolCallId) {
    return { id: allocate(), action: "insert" }
  }
  if (existing.decision == null) return { id: existing.id, action: "reuse" }
  return { id: existing.id, action: "decided" }
}

export function approvalArgsMatch(stored: string, incoming: unknown): boolean {
  const next = incoming ?? {}
  try {
    return canonicalizeJson(JSON.parse(stored)) === canonicalizeJson(next)
  } catch {
    return stored === JSON.stringify(next)
  }
}

function canonicalizeJson(value: unknown): string {
  return JSON.stringify(value)
}

/** 已决 id：args 哈希一致回放；不一致 fail closed。 */
export function planRememberApproval(
  existing: ApprovalRow | undefined,
  incoming: Pick<ApprovalRow, "id" | "runId" | "toolCallId"> & { args: unknown },
  allocate: () => string
): RememberApprovalPlan {
  const next = nextApprovalId(existing, incoming, allocate)
  if (next.action === "insert" || next.action === "reuse") return next
  const decision = existing?.decision ?? "deny"
  if (existing && approvalArgsMatch(existing.args, incoming.args)) {
    return { id: existing.id, action: "replay", decision }
  }
  return { id: existing?.id ?? incoming.id, action: "fail_closed", decision }
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
