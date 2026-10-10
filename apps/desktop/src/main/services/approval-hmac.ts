/**
 * 审批 HMAC：密钥进 userData（safeStorage），重启后未决审批仍可验。
 */
import {
  approvalPayload,
  getApproval,
  getApprovalByRunAndSdkId,
  getApprovalBySdkIdentity,
  insertApproval,
  isSupersededSdkApprovalId,
  migrateApprovalForRepark,
  planRememberApproval,
  planSameRunSdkCollision,
  resolvedSdkApprovalId,
  setApprovalDecision,
  setApprovalSdkResponse,
  signApproval,
  verifyApproval
} from "@enjoy-agents/db"
import { getDatabase } from "./database"
import { createId } from "./ids"
import { machineHmacSecret } from "./machine-hmac-secret.ts"

export function rememberApproval(input: {
  runId: string
  approvalId: string
  toolCallId: string
  name: string
  args: unknown
  requestArgs?: unknown
}) {
  const db = getDatabase()
  const args = input.args ?? {}
  const requestArgs = input.requestArgs !== undefined ? input.requestArgs : args
  const sdkApprovalId = input.approvalId
  const existing = getApprovalBySdkIdentity(db, {
    sdkApprovalId,
    runId: input.runId,
    toolCallId: input.toolCallId
  })
  if (!existing) {
    const colliding = getApprovalByRunAndSdkId(db, { runId: input.runId, sdkApprovalId })
    if (colliding && colliding.toolCallId !== input.toolCallId) {
      logSameRunSdkCollision({
        runId: input.runId,
        sdkApprovalId,
        existingToolCallId: colliding.toolCallId,
        incomingToolCallId: input.toolCallId
      })
      return planSameRunSdkCollision(sdkApprovalId)
    }
  }
  const plan = planRememberApproval(
    existing,
    { sdkApprovalId, args: requestArgs ?? args },
    // 主键空闲时内部 id 用 SDK id；已被别的 run 占用才新开一行。
    () => (getApproval(db, sdkApprovalId) ? createId("apr") : sdkApprovalId)
  )
  if (plan.action !== "insert") return plan
  const payload = approvalPayload({
    runId: input.runId,
    toolCallId: input.toolCallId,
    approvalId: plan.id,
    name: input.name,
    args
  })
  insertApproval(db, {
    id: plan.id,
    runId: input.runId,
    toolCallId: input.toolCallId,
    name: input.name,
    args: JSON.stringify(args),
    requestArgs: JSON.stringify(requestArgs ?? {}),
    hmac: signApproval(machineHmacSecret(), payload),
    decision: null,
    createdAt: Date.now(),
    sdkApprovalId: plan.sdkApprovalId
  })
  return plan
}

/** 二次确认：新内部 id，sdk_approval_id 迁到新行；旧行关闭，pending / HMAC 失效。 */
export function rememberReparkApproval(input: {
  existingApprovalId: string
  runId: string
  toolCallId: string
  name: string
  args: unknown
  requestArgs?: unknown
}) {
  const db = getDatabase()
  const row = getApproval(db, input.existingApprovalId)
  if (!row) {
    return rememberApproval({
      runId: input.runId,
      approvalId: createId("apr"),
      toolCallId: input.toolCallId,
      name: input.name,
      args: input.args ?? {},
      requestArgs: input.requestArgs
    })
  }
  const nextId = createId("apr")
  const args = input.args ?? {}
  const payload = approvalPayload({
    runId: input.runId,
    toolCallId: input.toolCallId,
    approvalId: nextId,
    name: input.name,
    args
  })
  const migrated = migrateApprovalForRepark(db, {
    existingId: row.id,
    nextId,
    name: input.name,
    args: JSON.stringify(args),
    hmac: signApproval(machineHmacSecret(), payload),
    requestArgs: input.requestArgs === undefined ? undefined : JSON.stringify(input.requestArgs),
    createdAt: Date.now()
  })
  return { id: migrated.id, action: "repark" as const, sdkApprovalId: migrated.sdkApprovalId }
}

export function sdkApprovalIdFor(approvalId: string): string {
  const row = getApproval(getDatabase(), approvalId)
  if (!row || isSupersededSdkApprovalId(row.sdkApprovalId)) {
    throw new Error("No matching tool approval is waiting.")
  }
  return resolvedSdkApprovalId(row)
}

function logSameRunSdkCollision(input: {
  runId: string
  sdkApprovalId: string
  existingToolCallId: string
  incomingToolCallId: string
}): void {
  console.warn("approval sdk id collision", {
    runId: input.runId,
    sdkApprovalId: input.sdkApprovalId,
    existingToolCallId: input.existingToolCallId,
    incomingToolCallId: input.incomingToolCallId
  })
}

export function assertApprovalHmac(input: {
  runId: string
  approvalId: string
  toolCallId: string
}): void {
  const row = getApproval(getDatabase(), input.approvalId)
  if (!row || isSupersededSdkApprovalId(row.sdkApprovalId)) {
    throw new Error("No matching tool approval is waiting.")
  }
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
  if (!verifyApproval(machineHmacSecret(), payload, row.hmac)) {
    throw new Error("Approval token was tampered.")
  }
}

export function recordApprovalDecision(approvalId: string, decision: string): void {
  setApprovalDecision(getDatabase(), approvalId, decision)
}

export function recordSdkApprovalResponse(
  approvalId: string,
  response: { approved: boolean; reason?: string; resumeCode?: string }
): void {
  setApprovalSdkResponse(getDatabase(), approvalId, response)
}
