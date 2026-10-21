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
import { pushCredentialCheckNow } from "./chat-readiness-snapshot.ts"
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

/** 回写 + 整张快照重算推送（成功收工走这条）。 */
export async function persistCredentialAfterSend(
  run: ActiveRun,
  outcome: "ok" | ChatSendPersist
): Promise<CredentialCheck | undefined> {
  const written = await recordCredentialAfterSend(run, outcome)
  if (!written) return undefined
  await pushFullReadinessAfterSend()
  return written
}

/**
 * 只回写 + 立刻推「这份档案的校验态」（改缓存快照里那一项，不重算）。
 * jojo #169 P3：401 之后「能不能发」要马上变成被拒；整张快照重算要列引擎、ping 本机模型（各 400ms），
 * 那段空窗里渲染端还当密钥正常、按 Enter 被 main 拒掉。失败收口先 await 这一步再发 run.error。
 */
export async function recordCredentialAfterSend(
  run: ActiveRun,
  outcome: "ok" | ChatSendPersist
): Promise<CredentialCheck | undefined> {
  const profileId = run.profileId
  if (!profileId || !run.secret?.apiKey?.trim()) return undefined
  if ((run.input.runtimeId ?? "enjoy-local") !== "enjoy-local") return undefined
  // 直接读 vault（secrets-vault），不经 secrets.ts：失败收口不拉引擎绑定那串模块。
  const { readVault } = await import("./secrets-vault.ts")
  const profile = (await readVault()).profiles.find((row) => row.id === profileId)
  if (!profile) return undefined
  const currentFp = credentialFingerprint(profile)
  const startedFp = run.credentialFingerprint ?? currentFp
  const at = new Date().toISOString()
  const check = checkAfterSend(outcome, at)
  const written = writeCredentialCheckIfCurrent(profileId, check, startedFp, currentFp)
  if (!written) return undefined
  pushCredentialCheckNow(profileId, written)
  return written
}

/** 整张快照重算再推（失败收口里不 await：run.error 不等它）。 */
export async function pushFullReadinessAfterSend(): Promise<void> {
  try {
    const { pushChatReadinessNow } = await import("./chat-readiness")
    await pushChatReadinessNow()
  } catch {
    // 推不出去不影响收口：下次聚焦 / 存密钥会再推。
  }
}

function checkAfterSend(outcome: "ok" | ChatSendPersist, at: string): CredentialCheck {
  if (outcome === "ok") return credentialCheckAfterOkSend(at)
  if (outcome === "forbidden") return credentialCheckAfterForbidden(at)
  if (outcome === "billing") return credentialCheckAfterBilling(at)
  return credentialCheckAfterAuthRejected(at)
}
