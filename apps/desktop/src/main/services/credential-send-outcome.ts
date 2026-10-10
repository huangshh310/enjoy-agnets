/**
 * 首发结果回写 credentialCheck：成功 → ok；结构化 401/403 → invalid；网络不改。
 * 写回跟本轮实际用的档案 + 指纹，不静态拉 chat-readiness。
 */
import {
  classifyChatSendFailure,
  credentialCheckAfterAuthRejected,
  credentialCheckAfterOkSend,
  type ChatSendErrorCode,
  type CredentialCheck
} from "@enjoy-agents/ipc-contract/credential-check"
import { classifyError } from "@enjoy-agents/agent-core"
import { credentialFingerprint } from "./credential-fingerprint.ts"
import { writeCredentialCheckIfCurrent } from "./credential-check-store.ts"
import type { ActiveRun } from "./agent-run-state"

export function httpStatusOf(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined
  const record = error as Record<string, unknown>
  for (const key of ["status", "statusCode", "status_code"]) {
    if (typeof record[key] === "number") return record[key] as number
  }
  return undefined
}

export function classifyEnjoyLocalSendFailure(error: unknown): {
  code: ChatSendErrorCode
  persistInvalid: boolean
} | null {
  return classifyChatSendFailure({
    status: httpStatusOf(error),
    errorClass: classifyError(error).errorClass,
    message: classifyError(error).message
  })
}

export async function persistCredentialAfterSend(
  run: ActiveRun,
  outcome: "ok" | "invalid"
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
  const check = outcome === "ok" ? credentialCheckAfterOkSend(at) : credentialCheckAfterAuthRejected(at)
  const written = writeCredentialCheckIfCurrent(profileId, check, startedFp, currentFp)
  if (!written) return undefined
  const { pushChatReadinessNow } = await import("./chat-readiness")
  await pushChatReadinessNow().catch(() => undefined)
  return written
}
