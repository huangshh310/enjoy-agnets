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
  | "sdk_id_collision"

export type RememberApprovalPlan =
  | { id: string; action: "insert"; sdkApprovalId: string }
  | { id: string; action: "reuse"; sdkApprovalId: string }
  | { id: string; action: "replay"; sdkApprovalId: string; decision: string; approved: boolean; reason?: string }
  | { id: string; action: "fail_closed"; sdkApprovalId: string; decision: string; cause: RememberApprovalFailCause }

const APPROVAL_COLUMNS = `id, run_id as runId, tool_call_id as toolCallId, name, args, hmac, decision,
              created_at as createdAt, request_args as requestArgs, sdk_approved as sdkApproved,
              sdk_reason as sdkReason, resume_code as resumeCode, sdk_approval_id as sdkApprovalId`

/** 旧行释放三元组时写入 sdk_approval_id，UNIQUE 与回放都不再命中。 */
export const SUPERSEDED_SDK_PREFIX = "superseded:"

const ACTIVE_SDK_IDENTITY_SQL = `(sdk_approval_id IS NULL OR sdk_approval_id NOT LIKE '${SUPERSEDED_SDK_PREFIX}%')`

export function supersededSdkApprovalId(internalId: string): string {
  return `${SUPERSEDED_SDK_PREFIX}${internalId}`
}

export function isSupersededSdkApprovalId(sdkApprovalId: string | null | undefined): boolean {
  return Boolean(sdkApprovalId?.startsWith(SUPERSEDED_SDK_PREFIX))
}

/** 同一未决行幂等复用；已决保留内部 id。查找已按 run+toolCall+SDK id 收窄。 */
export function nextApprovalId(
  existing: Pick<ApprovalRow, "id" | "decision"> | undefined,
  allocate: () => string
): NextApprovalId {
  if (!existing) return { id: allocate(), action: "insert" }
  if (existing.decision == null) return { id: existing.id, action: "reuse" }
  return { id: existing.id, action: "decided" }
}

/** 旧行 `sdk_approval_id` 为 NULL 时，内部 id 当作 SDK id。 */
export function resolvedSdkApprovalId(row: Pick<ApprovalRow, "id" | "sdkApprovalId">): string {
  return row.sdkApprovalId || row.id
}

export function planSameRunSdkCollision(sdkApprovalId: string): RememberApprovalPlan {
  return {
    id: sdkApprovalId,
    action: "fail_closed",
    sdkApprovalId,
    decision: "deny",
    cause: "sdk_id_collision"
  }
}

export function planRememberApproval(
  existing: ApprovalRow | undefined,
  incoming: { sdkApprovalId: string; args: unknown },
  allocate: () => string
): RememberApprovalPlan {
  const next = nextApprovalId(existing, allocate)
  const sdkApprovalId = existing ? resolvedSdkApprovalId(existing) : incoming.sdkApprovalId
  if (next.action === "insert" || next.action === "reuse") {
    return { id: next.id, action: next.action, sdkApprovalId }
  }
  const decision = existing?.decision ?? "deny"
  if (!existing || !approvalArgsMatch(existing.requestArgs ?? existing.args, incoming.args)) {
    return { id: next.id, action: "fail_closed", sdkApprovalId, decision, cause: "args_mismatch" }
  }
  return planSdkReplay(existing, next.id, sdkApprovalId, decision)
}

/** 已决回放闸：没发过 SDK / 带 resumeCode / desktop_act allow 一律 fail closed。重启回挂必须走这里。 */
export function planSdkReplay(
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
       WHERE run_id = ? AND tool_call_id = ? AND COALESCE(sdk_approval_id, id) = ?
         AND ${ACTIVE_SDK_IDENTITY_SQL}
       ORDER BY CASE WHEN decision IS NULL THEN 0 ELSE 1 END, created_at DESC`
    )
    .get(input.runId, input.toolCallId, input.sdkApprovalId) as ApprovalRow | undefined
}

/** 同一 run 内按 SDK id 找行，用来拦不同 toolCall 的碰撞。 */
export function getApprovalByRunAndSdkId(
  db: AppDatabase,
  input: { runId: string; sdkApprovalId: string }
): ApprovalRow | undefined {
  return db
    .prepare(
      `SELECT ${APPROVAL_COLUMNS} FROM approvals
       WHERE run_id = ? AND COALESCE(sdk_approval_id, id) = ?
         AND ${ACTIVE_SDK_IDENTITY_SQL}
       ORDER BY CASE WHEN decision IS NULL THEN 0 ELSE 1 END, created_at DESC`
    )
    .get(input.runId, input.sdkApprovalId) as ApprovalRow | undefined
}

export function getApprovalByRunAndToolCall(
  db: AppDatabase,
  input: { runId: string; toolCallId: string }
): ApprovalRow | undefined {
  return db
    .prepare(
      `SELECT ${APPROVAL_COLUMNS} FROM approvals
       WHERE run_id = ? AND tool_call_id = ?
         AND ${ACTIVE_SDK_IDENTITY_SQL}
       ORDER BY CASE WHEN decision IS NULL THEN 0 ELSE 1 END, created_at DESC`
    )
    .get(input.runId, input.toolCallId) as ApprovalRow | undefined
}

/** 二次确认 / repark：新内部 id 接走 sdk_approval_id，旧行释放三元组并关闭。 */
export function migrateApprovalForRepark(
  db: AppDatabase,
  input: {
    existingId: string
    nextId: string
    name: string
    args: string
    hmac: string
    requestArgs?: string
    createdAt: number
  }
): { id: string; sdkApprovalId: string } {
  const existing = getApproval(db, input.existingId)
  if (!existing) throw new Error("No matching tool approval is waiting.")
  if (isSupersededSdkApprovalId(existing.sdkApprovalId)) {
    throw new Error("No matching tool approval is waiting.")
  }
  const sdkApprovalId = resolvedSdkApprovalId(existing)
  db.exec("BEGIN IMMEDIATE")
  try {
    db.prepare(
      `UPDATE approvals SET sdk_approval_id = ?, hmac = ?,
         decision = COALESCE(decision, 'superseded')
       WHERE id = ?`
    ).run(supersededSdkApprovalId(existing.id), "", existing.id)
    insertApproval(db, {
      id: input.nextId,
      runId: existing.runId,
      toolCallId: existing.toolCallId,
      name: input.name,
      args: input.args,
      hmac: input.hmac,
      decision: null,
      createdAt: input.createdAt,
      requestArgs: input.requestArgs ?? existing.requestArgs ?? input.args,
      sdkApprovalId
    })
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
  return { id: input.nextId, sdkApprovalId }
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

export type LivePendingApproval = {
  id: string
  runId: string
  sessionId: string
  workspaceId: string | null
  sessionTitle: string
  name: string
  toolCallId: string
  createdAt: number
  args?: string | null
  requestArgs?: string | null
}

/** Inbox 拍板真源：未决、未 superseded、会话未归档，且 run 仍活着（等审批 / 在跑）。 */
export function listLivePendingApprovals(db: AppDatabase): LivePendingApproval[] {
  return db
    .prepare(
      `SELECT a.id as id, a.run_id as runId, a.tool_call_id as toolCallId, a.name as name,
              a.created_at as createdAt, a.args as args, a.request_args as requestArgs,
              r.session_id as sessionId, r.workspace_id as workspaceId,
              COALESCE(s.title, '') as sessionTitle
       FROM approvals a
       JOIN runs r ON r.id = a.run_id
       JOIN sessions s ON s.id = r.session_id
       WHERE a.decision IS NULL AND s.archived_at IS NULL
         AND r.status IN ('waiting_review', 'running')
         AND ${ACTIVE_SDK_IDENTITY_SQL.replaceAll("sdk_approval_id", "a.sdk_approval_id")}
       ORDER BY a.created_at DESC`
    )
    .all() as LivePendingApproval[]
}
