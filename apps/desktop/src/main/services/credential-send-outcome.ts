/**
 * 首发结果回写 credentialCheck：成功 → ok；结构化 401 → invalid；403/402 走 unverified。
 * 写回跟本轮实际用的档案 + 指纹，不静态拉 chat-readiness。
 */
import {
  classifyChatSendFailure,
  credentialCheckAfterAuthRejected,
  credentialCheckAfterBilling,
  credentialCheckAfterForbidden,
  credentialCheckAfterOkSend,
  type ChatSendErrorCode,
  type ChatSendPersist,
  type CredentialCheck
} from "@enjoy-agents/ipc-contract/credential-check"
import { classifyError } from "@enjoy-agents/agent-core"
import { credentialFingerprint } from "./credential-fingerprint.ts"
import { writeCredentialCheckIfCurrent } from "./credential-check-store.ts"
import type { ActiveRun } from "./agent-run-state"

export function httpStatusOf(error: unknown, seen = new WeakSet<object>()): number | undefined {
  if (!error || typeof error !== "object") return undefined
  if (seen.has(error)) return undefined
  seen.add(error)
  const record = error as Record<string, unknown>
  for (const key of ["status", "statusCode", "status_code"]) {
    if (typeof record[key] === "number") return record[key] as number
  }
  return httpStatusOf(record.lastError, seen) ?? httpStatusOf(record.cause, seen)
}

export function structuredErrorTypeOf(
  error: unknown,
  seen = new WeakSet<object>()
): string | undefined {
  if (!error || typeof error !== "object") return undefined
  if (seen.has(error)) return undefined
  seen.add(error)
  const record = error as Record<string, unknown>
  for (const value of [record.type, record.errorType]) {
    if (isStructuredType(value)) return value
  }
  const nested = record.error
  if (nested && typeof nested === "object") {
    const inner = nested as Record<string, unknown>
    for (const value of [inner.type, inner.code]) {
      if (isStructuredType(value)) return value
    }
  }
  const data = record.data
  if (data && typeof data === "object") {
    const payload = data as Record<string, unknown>
    if (isStructuredType(payload.type)) return payload.type
    const inner = payload.error
    if (inner && typeof inner === "object") {
      const typed = inner as Record<string, unknown>
      if (isStructuredType(typed.type)) return typed.type
    }
  }
  return structuredErrorTypeOf(record.lastError, seen) ?? structuredErrorTypeOf(record.cause, seen)
}

function isStructuredType(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !/^\d+$/.test(value)
}

export function classifyEnjoyLocalSendFailure(error: unknown): {
  code: ChatSendErrorCode
  persist: ChatSendPersist | null
} | null {
  return classifyChatSendFailure({
    status: httpStatusOf(error),
    errorClass: classifyError(error).errorClass,
    message: classifyError(error).message,
    errorType: structuredErrorTypeOf(error)
  })
}

export async function persistCredentialAfterSend(
  run: ActiveRun,
  outcome: "ok" | ChatSendPersist
): Promise<CredentialCheck | undefined> {
  const profileId = run.profileId
  if (!profileId || !run.secret?.apiKey?.trim()) return undefined
  if ((run.input.runtimeId ?? "enjoy-local") !== "enjoy-local") return undefined
  const { findProfileById } = await import("./secrets.ts")
  const profile = await findProfileById(profileId)
  if (!profile) return undefined
  const currentFp = credentialFingerprint(profile)
  const startedFp = run.credentialFingerprint ?? currentFp
  const at = new Date().toISOString()
  const check = checkAfterSend(outcome, at)
  const written = writeCredentialCheckIfCurrent(profileId, check, startedFp, currentFp)
  if (!written) return undefined
  const { pushChatReadinessNow } = await import("./chat-readiness")
  await pushChatReadinessNow().catch(() => undefined)
  return written
}

function checkAfterSend(outcome: "ok" | ChatSendPersist, at: string): CredentialCheck {
  if (outcome === "ok") return credentialCheckAfterOkSend(at)
  if (outcome === "forbidden") return credentialCheckAfterForbidden(at)
  if (outcome === "billing") return credentialCheckAfterBilling(at)
  return credentialCheckAfterAuthRejected(at)
}
