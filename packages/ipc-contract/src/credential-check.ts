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

const CredentialCheckShape = z
  .object({
    state: CredentialCheckState.catch("unverified"),
    code: CredentialCheckCode.optional(),
    checkedAt: z.string().optional()
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

/** 404/405：没有目录，应改走 1 token probe。 */
export function catalogMissingStatus(status: number): boolean {
  return status === 404 || status === 405
}
