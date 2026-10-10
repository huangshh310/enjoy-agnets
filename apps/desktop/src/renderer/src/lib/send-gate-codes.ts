/**
 * 发送闸 / 首发失败稳定码：只从合约枚举读，不在 renderer 扩 Zod，不回落字面量。
 */
import {
  ChatSendErrorCode,
  CREDENTIAL_INVALID,
  NO_CHAT_ROUTE,
  PROVIDER_BILLING,
  PROVIDER_FORBIDDEN,
  PROVIDER_UNREACHABLE,
  SendGateCode
} from "@enjoy-agents/ipc-contract/chat-readiness"

export {
  ChatSendErrorCode,
  CREDENTIAL_INVALID,
  NO_CHAT_ROUTE,
  PROVIDER_BILLING,
  PROVIDER_FORBIDDEN,
  PROVIDER_UNREACHABLE,
  SendGateCode
}
export type { SendGateCode as SendGateCodeName }

export function providerUnreachableCode(): string {
  return ChatSendErrorCode.enum.provider_unreachable
}

export function providerForbiddenCode(): string {
  return ChatSendErrorCode.enum.provider_forbidden
}

export function providerBillingCode(): string {
  return ChatSendErrorCode.enum.provider_billing
}

export function isCredentialInvalid(code: string): boolean {
  return code === CREDENTIAL_INVALID || code.includes(CREDENTIAL_INVALID)
}

export function isProviderUnreachable(code: string): boolean {
  return code === PROVIDER_UNREACHABLE || code.includes(PROVIDER_UNREACHABLE)
}

export function isProviderForbidden(code: string): boolean {
  return code === PROVIDER_FORBIDDEN || code.includes(PROVIDER_FORBIDDEN)
}

export function isProviderBilling(code: string): boolean {
  return code === PROVIDER_BILLING || code.includes(PROVIDER_BILLING)
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
