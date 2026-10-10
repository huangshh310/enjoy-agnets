/**
 * 存密钥后的一次轻量校验。main 落盘，renderer 只读。
 * 禁止回传 HTTP 原文 / JSON；只有 state + 稳定码。
 */
import { z } from "zod"

export const CredentialCheckState = z.enum(["ok", "invalid", "unverified"])
export type CredentialCheckState = z.infer<typeof CredentialCheckState>

export const CredentialCheckCode = z.enum(["auth_rejected", "network", "timeout", "unknown"])
export type CredentialCheckCode = z.infer<typeof CredentialCheckCode>

export const CREDENTIAL_INVALID = "credential_invalid"
/** 首发连不上供应商（网络 / 超时）。不改 credentialCheck，不当 invalid。 */
export const PROVIDER_UNREACHABLE = "provider_unreachable"

/** 跑中失败稳定码。走 IPC / run.error.code，禁止摊 HTTP 原文。 */
export const ChatSendErrorCode = z.enum([CREDENTIAL_INVALID, PROVIDER_UNREACHABLE])
export type ChatSendErrorCode = z.infer<typeof ChatSendErrorCode>

const CredentialCheckShape = z
  .object({
    state: CredentialCheckState.catch("unverified"),
    code: CredentialCheckCode.optional(),
    checkedAt: z.string().optional(),
    /** 一次成功发送后与 checkedAt 同戳。缺省不挡旧快照。 */
    verifiedAt: z.string().optional()
  })
  .strict()

export const CredentialCheck = CredentialCheckShape.catch({ state: "unverified" })
export type CredentialCheck = z.infer<typeof CredentialCheckShape>

export const RecheckProviderInput = z.object({ id: z.string().min(1) }).strict()
export type RecheckProviderInput = z.infer<typeof RecheckProviderInput>

export const ReviewChangedFiles = z
  .object({
    names: z.array(z.string().min(1)).max(3),
    total: z.number().int().nonnegative()
  })
  .strict()
export type ReviewChangedFiles = z.infer<typeof ReviewChangedFiles>

export function parseCredentialCheck(raw: unknown): CredentialCheck {
  return CredentialCheck.parse(raw)
}

/** 401/403 → invalid；5xx / 其它状态 → unverified。2xx 由调用方当 ok。 */
export function classifyCredentialStatus(status: number): CredentialCheck {
  if (status === 401 || status === 403) {
    return { state: "invalid", code: "auth_rejected" }
  }
  if (status >= 500 || status < 200) {
    return { state: "unverified", code: "unknown" }
  }
  if (status >= 200 && status < 300) return { state: "ok" }
  return { state: "unverified", code: "unknown" }
}

export function classifyCredentialFailure(kind: "timeout" | "network" | "unknown"): CredentialCheck {
  if (kind === "timeout") return { state: "unverified", code: "timeout" }
  if (kind === "network") return { state: "unverified", code: "network" }
  return { state: "unverified", code: "unknown" }
}

export function withCredentialCheckedAt(
  check: CredentialCheck,
  at: string
): CredentialCheck {
  return { ...check, checkedAt: at }
}

export function credentialCheckAfterOkSend(at: string): CredentialCheck {
  return { state: "ok", checkedAt: at, verifiedAt: at }
}

export function credentialCheckAfterAuthRejected(at: string): CredentialCheck {
  return { state: "invalid", code: "auth_rejected", checkedAt: at }
}

/**
 * 首发失败：只有结构化 401/403 才落盘 invalid。
 * 不信 message 正则，也不信 errorClass==="auth"（"140100 tokens" / 模型无权会误伤）。
 * 网络 / 超时 → provider_unreachable 且不改落盘态。
 */
export function classifyChatSendFailure(input: {
  status?: number
  errorClass?: string
  message?: string
}): { code: ChatSendErrorCode; persistInvalid: boolean } | null {
  const status = input.status
  if (status === 401 || status === 403) {
    return { code: CREDENTIAL_INVALID, persistInvalid: true }
  }
  if (input.errorClass === "timeout" || isUnreachableFailure(input)) {
    return { code: PROVIDER_UNREACHABLE, persistInvalid: false }
  }
  return null
}

function isUnreachableFailure(input: { errorClass?: string; message?: string }): boolean {
  if (input.errorClass === "provider" && looksUnreachable(input.message)) return true
  return looksUnreachable(input.message)
}

function looksUnreachable(message: string | undefined): boolean {
  if (!message) return false
  const lower = message.toLowerCase()
  return (
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("etimedout") ||
    lower.includes("econnreset") ||
    lower.includes("fetch failed") ||
    lower.includes("network") ||
    lower.includes("socket") ||
    lower.includes("getaddrinfo") ||
    lower.includes("timeout")
  )
}

/** 404/405：没有目录。直接 unverified，禁止 1 token 回落以免扣费。 */
export function catalogMissingStatus(status: number): boolean {
  return status === 404 || status === 405
}
