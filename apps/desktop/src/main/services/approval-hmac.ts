/**
 * 审批 HMAC：密钥进 userData（safeStorage），重启后未决审批仍可验。
 */
import { randomBytes } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { app, safeStorage } from "electron"
import {
  approvalPayload,
  getApproval,
  getApprovalBySdkIdentity,
  insertApproval,
  planRememberApproval,
  setApprovalDecision,
  setApprovalSdkResponse,
  signApproval,
  verifyApproval
} from "@enjoy-agents/db"
import { getDatabase } from "./database"
import { createId } from "./ids"

let processSecret: string | undefined

function hmacFile(): string {
  return join(app.getPath("userData"), "approval-hmac.bin")
}

function approvalSecret(): string {
  if (processSecret) return processSecret
  processSecret = readPersistedSecret() ?? randomBytes(32).toString("hex")
  persistSecret(processSecret)
  return processSecret
}

function readPersistedSecret(): string | undefined {
  const file = hmacFile()
  if (!existsSync(file)) return undefined
  try {
    const buf = readFileSync(file)
    if (safeStorage.isEncryptionAvailable()) return safeStorage.decryptString(buf)
    return buf.toString("utf8")
  } catch {
    return undefined
  }
}

function persistSecret(secret: string): void {
  try {
    const payload = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(secret)
      : Buffer.from(secret, "utf8")
    writeFileSync(hmacFile(), payload, { mode: 0o600 })
  } catch {
    // 写盘失败仍用内存密钥，本进程内审批可用。
  }
}

export function rememberApproval(input: {
  runId: string
  approvalId: string
  toolCallId: string
  name: string
  args: unknown
  requestArgs?: unknown
}) {
  const db = getDatabase()
  const requestArgs = input.requestArgs ?? input.args
  const sdkApprovalId = input.approvalId
  const plan = planRememberApproval(
    getApprovalBySdkIdentity(db, {
      sdkApprovalId,
      runId: input.runId,
      toolCallId: input.toolCallId
    }),
    { sdkApprovalId, args: requestArgs },
    // 主键空闲时内部 id 用 SDK id；已被别的 run 占用才新开一行。
    () => (getApproval(db, sdkApprovalId) ? createId("apr") : sdkApprovalId)
  )
  if (plan.action !== "insert") return plan
  const payload = approvalPayload({
    runId: input.runId,
    toolCallId: input.toolCallId,
    approvalId: plan.id,
    name: input.name,
    args: input.args
  })
  insertApproval(db, {
    id: plan.id,
    runId: input.runId,
    toolCallId: input.toolCallId,
    name: input.name,
    args: JSON.stringify(input.args ?? {}),
    requestArgs: JSON.stringify(requestArgs ?? {}),
    hmac: signApproval(approvalSecret(), payload),
    decision: null,
    createdAt: Date.now(),
    sdkApprovalId: plan.sdkApprovalId
  })
  return plan
}

export function sdkApprovalIdFor(approvalId: string): string {
  return getApproval(getDatabase(), approvalId)?.sdkApprovalId || approvalId
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

export function recordSdkApprovalResponse(
  approvalId: string,
  response: { approved: boolean; reason?: string; resumeCode?: string }
): void {
  setApprovalSdkResponse(getDatabase(), approvalId, response)
}
