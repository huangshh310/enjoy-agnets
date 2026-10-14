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
import {
  httpStatusOf,
  isToolSurfacedError,
  networkErrorCodeOf,
  structuredErrorTypeOf
} from "./credential-status.ts"
import type { ActiveRun } from "./agent-run-state"

export {
  httpStatusOf,
  isToolSurfacedError,
  networkErrorCodeOf,
  structuredErrorTypeOf
} from "./credential-status.ts"

/** 只认 provider 自己的失败：工具 / MCP 抛上来的 401 / 网络错不改密钥状态、不触发首字前回滚。 */
export function classifyEnjoyLocalSendFailure(error: unknown): {
  code: ChatSendErrorCode
  persist: ChatSendPersist | null
} | null {
  if (isToolSurfacedError(error)) return null
  const classified = classifyError(error)
  return classifyChatSendFailure({
    status: httpStatusOf(error),
    errorClass: classified.errorClass,
    message: classified.message,
    errorType: structuredErrorTypeOf(error),
    networkCode: networkErrorCodeOf(error)
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
