/**
 * 审批行：内部 id 与 SDK approval id 拆开。回放只认同一 run / toolCall / SDK id。
 */
import type { AppDatabase } from "../client"
import { approvalArgsMatch } from "./approval-args.ts"

export { approvalArgsMatch } from "./approval-args.ts"
export {
  APPROVAL_PARK_ENRICHED_KEYS,
  canonicalizeJson,
  stripParkEnrichedFields
} from "./approval-args.ts"

export type ApprovalRow = {
  id: string
  runId: string
  toolCallId: string
  name: string
  args: string
  hmac: string
  decision: string | null
  createdAt: number
  requestArgs?: string | null
  sdkApproved?: number | null
  sdkReason?: string | null
  resumeCode?: string | null
  sdkApprovalId?: string | null
}

export type NextApprovalId =
  | { id: string; action: "insert" }
  | { id: string; action: "reuse" }
  | { id: string; action: "decided" }

export type RememberApprovalFailCause =
  | "args_mismatch"
  | "unsent"
  | "resume_code"
  | "desktop_act_allow"

export type RememberApprovalPlan =
  | { id: string; action: "insert"; sdkApprovalId: string }
  | { id: string; action: "reuse"; sdkApprovalId: string }
  | { id: string; action: "replay"; sdkApprovalId: string; decision: string; approved: boolean; reason?: string }
  | { id: string; action: "fail_closed"; sdkApprovalId: string; decision: string; cause: RememberApprovalFailCause }

const APPROVAL_COLUMNS = `id, run_id as runId, tool_call_id as toolCallId, name, args, hmac, decision,
              created_at as createdAt, request_args as requestArgs, sdk_approved as sdkApproved,
              sdk_reason as sdkReason, resume_code as resumeCode, sdk_approval_id as sdkApprovalId`

/** 同一未决行幂等复用；已决保留内部 id。查找已按 run+toolCall+SDK id 收窄。 */
export function nextApprovalId(
  existing: Pick<ApprovalRow, "id" | "decision"> | undefined,
  allocate: () => string
): NextApprovalId {
  if (!existing) return { id: allocate(), action: "insert" }
  if (existing.decision == null) return { id: existing.id, action: "reuse" }
  return { id: existing.id, action: "decided" }
}

export function planRememberApproval(
  existing: ApprovalRow | undefined,
  incoming: { sdkApprovalId: string; args: unknown },
  allocate: () => string
): RememberApprovalPlan {
  const next = nextApprovalId(existing, allocate)
  const sdkApprovalId = existing?.sdkApprovalId || incoming.sdkApprovalId
  if (next.action === "insert" || next.action === "reuse") {
    return { id: next.id, action: next.action, sdkApprovalId }
  }
  const decision = existing?.decision ?? "deny"
  if (!existing || !approvalArgsMatch(existing.requestArgs ?? existing.args, incoming.args)) {
    return { id: next.id, action: "fail_closed", sdkApprovalId, decision, cause: "args_mismatch" }
  }
  return planSdkReplay(existing, next.id, sdkApprovalId, decision)
}

function planSdkReplay(
  existing: ApprovalRow,
  id: string,
  sdkApprovalId: string,
  decision: string
): RememberApprovalPlan {
  if (existing.sdkApproved == null) {
    return { id, action: "fail_closed", sdkApprovalId, decision, cause: "unsent" }
  }
  if (existing.resumeCode) {
    return { id, action: "fail_closed", sdkApprovalId, decision, cause: "resume_code" }
  }
  const approved = existing.sdkApproved === 1
  if (existing.name === "desktop_act" && approved) {
    return { id, action: "fail_closed", sdkApprovalId, decision, cause: "desktop_act_allow" }
  }
  return {
    id,
    action: "replay",
    sdkApprovalId,
    decision,
    approved,
    reason: existing.sdkReason ?? undefined
  }
}

export function insertApproval(db: AppDatabase, row: ApprovalRow): void {
  db.prepare(
    `INSERT INTO approvals (
       id, run_id, tool_call_id, name, args, hmac, decision, created_at,
       request_args, sdk_approved, sdk_reason, resume_code, sdk_approval_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.runId,
    row.toolCallId,
    row.name,
    row.args,
    row.hmac,
    row.decision,
    row.createdAt,
    row.requestArgs ?? row.args,
    row.sdkApproved ?? null,
    row.sdkReason ?? null,
    row.resumeCode ?? null,
    row.sdkApprovalId ?? row.id
  )
}

export function getApproval(db: AppDatabase, id: string): ApprovalRow | undefined {
  return db
    .prepare(`SELECT ${APPROVAL_COLUMNS} FROM approvals WHERE id = ?`)
    .get(id) as ApprovalRow | undefined
}

/** 回放只认同一 run、同一 toolCall、同一 SDK id。跨 run 的同名 SDK id 查不到，当作新请求。 */
export function getApprovalBySdkIdentity(
  db: AppDatabase,
  input: { sdkApprovalId: string; runId: string; toolCallId: string }
): ApprovalRow | undefined {
  return db
    .prepare(
      `SELECT ${APPROVAL_COLUMNS} FROM approvals
       WHERE run_id = ? AND tool_call_id = ? AND COALESCE(sdk_approval_id, id) = ?`
    )
    .get(input.runId, input.toolCallId, input.sdkApprovalId) as ApprovalRow | undefined
}

export function setApprovalDecision(db: AppDatabase, id: string, decision: string): void {
  db.prepare("UPDATE approvals SET decision = ? WHERE id = ?").run(decision, id)
}

export function setApprovalSdkResponse(
  db: AppDatabase,
  id: string,
  response: { approved: boolean; reason?: string; resumeCode?: string }
): void {
  db.prepare("UPDATE approvals SET sdk_approved = ?, sdk_reason = ?, resume_code = ? WHERE id = ?").run(
    response.approved ? 1 : 0,
    response.reason ?? null,
    response.resumeCode || null,
    id
  )
}

export function listPendingApprovals(db: AppDatabase, runId?: string): ApprovalRow[] {
  const rows = db
    .prepare(`SELECT ${APPROVAL_COLUMNS} FROM approvals WHERE decision IS NULL`)
    .all() as ApprovalRow[]
  return runId ? rows.filter((row) => row.runId === runId) : rows
}
