/**
 * 审批行：HMAC 存库，decide 时再验；回放只重发当时发给 SDK 的 response。
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
}

export type NextApprovalId =
  | { id: string; action: "insert" }
  | { id: string; action: "reuse" }
  | { id: string; action: "decided" }
  | { id: string; action: "fail_closed" }

export type RememberApprovalFailCause =
  | "args_mismatch"
  | "identity"
  | "unsent"
  | "resume_code"
  | "desktop_act_allow"

export type RememberApprovalPlan =
  | { id: string; action: "insert" }
  | { id: string; action: "reuse" }
  | { id: string; action: "replay"; decision: string; approved: boolean; reason?: string }
  | { id: string; action: "fail_closed"; decision: string; cause: RememberApprovalFailCause }

const APPROVAL_COLUMNS = `id, run_id as runId, tool_call_id as toolCallId, name, args, hmac, decision,
              created_at as createdAt, request_args as requestArgs, sdk_approved as sdkApproved,
              sdk_reason as sdkReason, resume_code as resumeCode`

/** 同一未决行幂等复用；已决且身份相同保留原 id；身份碰撞 fail closed。 */
export function nextApprovalId(
  existing: Pick<ApprovalRow, "id" | "runId" | "toolCallId" | "decision"> | undefined,
  incoming: Pick<ApprovalRow, "id" | "runId" | "toolCallId">
): NextApprovalId {
  if (!existing) return { id: incoming.id, action: "insert" }
  if (existing.runId !== incoming.runId || existing.toolCallId !== incoming.toolCallId) {
    console.error("[approvals] identity collision", {
      approvalId: existing.id,
      existingRunId: existing.runId,
      incomingRunId: incoming.runId,
      existingToolCallId: existing.toolCallId,
      incomingToolCallId: incoming.toolCallId
    })
    return { id: existing.id, action: "fail_closed" }
  }
  if (existing.decision == null) return { id: existing.id, action: "reuse" }
  return { id: existing.id, action: "decided" }
}

/** 已决 id：有当时发出的 SDK response 才原样回放；否则 fail closed。 */
export function planRememberApproval(
  existing: ApprovalRow | undefined,
  incoming: Pick<ApprovalRow, "id" | "runId" | "toolCallId"> & { args: unknown }
): RememberApprovalPlan {
  const next = nextApprovalId(existing, incoming)
  if (next.action === "insert" || next.action === "reuse") return next
  const decision = existing?.decision ?? "deny"
  if (next.action === "fail_closed") {
    return { id: next.id, action: "fail_closed", decision, cause: "identity" }
  }
  if (!existing || !approvalArgsMatch(existing.requestArgs ?? existing.args, incoming.args)) {
    return { id: existing?.id ?? incoming.id, action: "fail_closed", decision, cause: "args_mismatch" }
  }
  return planSdkReplay(existing, decision)
}

function planSdkReplay(
  existing: ApprovalRow,
  decision: string
): RememberApprovalPlan {
  if (existing.sdkApproved == null) {
    return { id: existing.id, action: "fail_closed", decision, cause: "unsent" }
  }
  if (existing.resumeCode) {
    return { id: existing.id, action: "fail_closed", decision, cause: "resume_code" }
  }
  const approved = existing.sdkApproved === 1
  if (existing.name === "desktop_act" && approved) {
    return { id: existing.id, action: "fail_closed", decision, cause: "desktop_act_allow" }
  }
  return {
    id: existing.id,
    action: "replay",
    decision,
    approved,
    reason: existing.sdkReason ?? undefined
  }
}

export function insertApproval(db: AppDatabase, row: ApprovalRow): void {
  db.prepare(
    `INSERT INTO approvals (
       id, run_id, tool_call_id, name, args, hmac, decision, created_at,
       request_args, sdk_approved, sdk_reason, resume_code
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
    row.resumeCode ?? null
  )
}

export function getApproval(db: AppDatabase, id: string): ApprovalRow | undefined {
  return db
    .prepare(`SELECT ${APPROVAL_COLUMNS} FROM approvals WHERE id = ?`)
    .get(id) as ApprovalRow | undefined
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
