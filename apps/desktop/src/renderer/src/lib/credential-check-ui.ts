/**
 * 密钥校验三态 → 词条。pending = 本地再验中。
 * 夹具 / 落盘可能只有 state+code、没有 checkedAt：有原因码就当验完。
 * forbidden / billing 是 unverified 的琥珀子态，不挡发送、不当 invalid。
 */
import { CredentialCheckCode, type CredentialCheck } from "@enjoy-agents/ipc-contract/credential-check"

export type CredentialUiState = "none" | "pending" | "ok" | "invalid" | "unverified"
export type CredentialUiTone = "success" | "danger" | "warning" | "muted"

const FALLBACK_FORBIDDEN = "forbidden"
const FALLBACK_BILLING = "billing"

function optionalZodEnum(schema: { enum: object }, key: string, fallback: string): string {
  const value = (schema.enum as Record<string, unknown>)[key]
  return typeof value === "string" ? value : fallback
}

export function credentialForbiddenCode(): string {
  return optionalZodEnum(CredentialCheckCode, "forbidden", FALLBACK_FORBIDDEN)
}

export function credentialBillingCode(): string {
  return optionalZodEnum(CredentialCheckCode, "billing", FALLBACK_BILLING)
}

export function isForbiddenCredentialCode(code: string | null | undefined): boolean {
  return code === credentialForbiddenCode()
}

export function isBillingCredentialCode(code: string | null | undefined): boolean {
  return code === credentialBillingCode()
}

export function isRestrictedCredentialCode(code: string | null | undefined): boolean {
  return isForbiddenCredentialCode(code) || isBillingCredentialCode(code)
}

export function credentialUiState(
  check: CredentialCheck | undefined,
  opts?: { pending?: boolean; hasKey?: boolean }
): CredentialUiState {
  if (opts?.pending) return "pending"
  if (!opts?.hasKey && !check) return "none"
  if (!check) return opts?.hasKey ? "pending" : "none"
  if (check.state === "ok") return "ok"
  if (check.state === "invalid") return "invalid"
  if (check.state === "unverified" && !check.checkedAt && !check.code) return "pending"
  return "unverified"
}

/** 点色：绿已连上 / 红只给密钥无效 / 琥珀 forbidden·billing / 其余中性灰。 */
export function credentialUiTone(
  state: Exclude<CredentialUiState, "none">,
  code?: string
): CredentialUiTone {
  if (state === "ok") return "success"
  if (state === "invalid") return "danger"
  if (state === "unverified" && isRestrictedCredentialCode(code)) return "warning"
  return "muted"
}

export function credentialStatusLabelKey(
  state: Exclude<CredentialUiState, "none">,
  code?: string
): string {
  if (state === "ok") return "settings.setupGuide.connectApiKeyConnected"
  if (state === "invalid") return "settings.setupGuide.credentialInvalid"
  if (state === "pending") return "settings.setupGuide.verifyPending"
  if (isRestrictedCredentialCode(code)) return "settings.setupGuide.credentialRestricted"
  return "settings.setupGuide.credentialUnverified"
}

export function credentialUnverifiedHintKey(code: string | undefined): string {
  if (isForbiddenCredentialCode(code)) return "settings.setupGuide.credentialUnverifiedForbidden"
  if (isBillingCredentialCode(code)) return "settings.setupGuide.credentialUnverifiedBilling"
  if (code === "network") return "settings.setupGuide.credentialUnverifiedNetwork"
  if (code === "timeout") return "settings.setupGuide.credentialUnverifiedTimeout"
  return "settings.setupGuide.credentialUnverifiedUnknown"
}

/** 末屏灰副标题：ready + unverified，且不是 forbidden/billing。 */
export function showReadyUnverifiedHint(input: {
  ready?: boolean
  credentialState?: CredentialCheck["state"]
  credentialCode?: string
}): boolean {
  return (
    input.ready === true &&
    input.credentialState === "unverified" &&
    !isRestrictedCredentialCode(input.credentialCode)
  )
}

/** 末屏琥珀副标题：唯一路线处于 forbidden/billing 时仍用「可以开始了」。 */
export function showReadyRestrictedHint(input: {
  ready?: boolean
  credentialState?: CredentialCheck["state"]
  credentialCode?: string
}): boolean {
  return (
    input.ready === true &&
    input.credentialState === "unverified" &&
    isRestrictedCredentialCode(input.credentialCode)
  )
}
