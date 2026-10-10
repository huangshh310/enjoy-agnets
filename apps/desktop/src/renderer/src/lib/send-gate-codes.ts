/**
 * 发送闸 / 首发失败稳定码：只从合约读，不在 renderer 扩 Zod。
 * provider_unreachable 在 ChatSendErrorCode，不在 SendGateCode 闸联合。
 * forbidden / billing 等 #135 新 tip 进枚举；未进时回落字面量，供 UI 先接 luna 终稿。
 */
import {
  ChatSendErrorCode,
  CREDENTIAL_INVALID,
  NO_CHAT_ROUTE,
  PROVIDER_UNREACHABLE,
  SendGateCode
} from "@enjoy-agents/ipc-contract/chat-readiness"

export { ChatSendErrorCode, CREDENTIAL_INVALID, NO_CHAT_ROUTE, PROVIDER_UNREACHABLE, SendGateCode }
export type { SendGateCode as SendGateCodeName }

const FALLBACK_FORBIDDEN = "provider_forbidden"
const FALLBACK_BILLING = "provider_billing"

function optionalZodEnum(schema: { enum: object }, key: string, fallback: string): string {
  const value = (schema.enum as Record<string, unknown>)[key]
  return typeof value === "string" ? value : fallback
}

export function providerUnreachableCode(): string {
  return ChatSendErrorCode.enum.provider_unreachable
}

/** 合约有 `provider_forbidden` 就读枚举，否则回落字面量。不扩 Zod。 */
export function providerForbiddenCode(): string {
  return optionalZodEnum(ChatSendErrorCode, "provider_forbidden", FALLBACK_FORBIDDEN)
}

/** 合约有 `provider_billing` 就读枚举，否则回落字面量。不扩 Zod。 */
export function providerBillingCode(): string {
  return optionalZodEnum(ChatSendErrorCode, "provider_billing", FALLBACK_BILLING)
}

export function isCredentialInvalid(code: string): boolean {
  return code === CREDENTIAL_INVALID || code.includes(CREDENTIAL_INVALID)
}

export function isProviderUnreachable(code: string): boolean {
  return code === PROVIDER_UNREACHABLE || code.includes(PROVIDER_UNREACHABLE)
}

export function isProviderForbidden(code: string): boolean {
  const pinned = providerForbiddenCode()
  return code === pinned || code.includes(pinned)
}

export function isProviderBilling(code: string): boolean {
  const pinned = providerBillingCode()
  return code === pinned || code.includes(pinned)
}

export function isProviderRestricted(code: string): boolean {
  return isProviderForbidden(code) || isProviderBilling(code)
}

/** 这些闸码 / 首发失败码要留草稿，禁止折成无路线。 */
export function isDraftKeepingSendGate(code: string | null | undefined): boolean {
  if (!code) return false
  return (
    code === NO_CHAT_ROUTE ||
    isCredentialInvalid(code) ||
    isProviderUnreachable(code) ||
    isProviderRestricted(code)
  )
}
