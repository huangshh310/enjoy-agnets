/**
 * 首发结果回写 credentialCheck：成功 → ok；401/403 → invalid；网络不改。
 */
import {
  classifyChatSendFailure,
  credentialCheckAfterAuthRejected,
  credentialCheckAfterOkSend,
  type ChatSendErrorCode,
  type CredentialCheck
} from "@enjoy-agents/ipc-contract/credential-check"
import { classifyError } from "@enjoy-agents/agent-core"
import { peekCachedChatReadiness, pushChatReadinessNow } from "./chat-readiness"
import { writeCredentialCheck } from "./credential-check-store.ts"
import { getActiveProfile } from "./secrets.ts"
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
  const classified = classifyError(error)
  return classifyChatSendFailure({
    status: httpStatusOf(error),
    errorClass: classified.errorClass,
    message: classified.message
  })
}

export async function persistCredentialAfterSend(
  run: ActiveRun,
  outcome: "ok" | "invalid"
): Promise<CredentialCheck | undefined> {
  const profileId = await keyedEnjoyProfileId(run)
  if (!profileId) return undefined
  const at = new Date().toISOString()
  const check = outcome === "ok" ? credentialCheckAfterOkSend(at) : credentialCheckAfterAuthRejected(at)
  writeCredentialCheck(profileId, check)
  await pushChatReadinessNow().catch(() => undefined)
  return check
}

async function keyedEnjoyProfileId(run: ActiveRun): Promise<string | undefined> {
  if ((run.input.runtimeId ?? "enjoy-local") !== "enjoy-local") return undefined
  if (!run.secret?.apiKey?.trim()) return undefined
  return peekCachedChatReadiness()?.defaultRoute?.profileId ?? (await getActiveProfile())?.id
}
