/**
 * 发送闸码只认合约。provider_unreachable 从 ChatSendErrorCode 读，不本地伪造。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  ChatSendErrorCode,
  CREDENTIAL_INVALID,
  PROVIDER_UNREACHABLE,
  SendGateCode
} from "@enjoy-agents/ipc-contract/chat-readiness"
import {
  isCredentialInvalid,
  isDraftKeepingSendGate,
  isProviderBilling,
  isProviderForbidden,
  isProviderUnreachable,
  NO_CHAT_ROUTE,
  providerBillingCode,
  providerForbiddenCode,
  providerUnreachableCode
} from "./send-gate-codes.ts"

test("credential_invalid 与无路线来自合约 SendGateCode", () => {
  assert.equal(CREDENTIAL_INVALID, SendGateCode.enum.credential_invalid)
  assert.equal(NO_CHAT_ROUTE, SendGateCode.enum.no_chat_route)
  assert.equal(isCredentialInvalid(CREDENTIAL_INVALID), true)
  assert.equal(isDraftKeepingSendGate(NO_CHAT_ROUTE), true)
  assert.equal(isDraftKeepingSendGate(CREDENTIAL_INVALID), true)
})

test("provider_unreachable 从合约 ChatSendErrorCode / SendGateCode 读", () => {
  const pinned = providerUnreachableCode()
  assert.equal(pinned, PROVIDER_UNREACHABLE)
  assert.equal(pinned, ChatSendErrorCode.enum.provider_unreachable)
  assert.equal(pinned, SendGateCode.enum.provider_unreachable)
  assert.equal(isProviderUnreachable(pinned), true)
  assert.equal(isDraftKeepingSendGate(pinned), true)
})

test("forbidden / billing 只从合约枚举读，不回落字面量", () => {
  const forbidden = providerForbiddenCode()
  const billing = providerBillingCode()
  assert.equal(forbidden, ChatSendErrorCode.enum.provider_forbidden)
  assert.equal(billing, ChatSendErrorCode.enum.provider_billing)
  assert.equal(forbidden, SendGateCode.enum.provider_forbidden)
  assert.equal(billing, SendGateCode.enum.provider_billing)
  assert.equal(isProviderForbidden(forbidden), true)
  assert.equal(isProviderBilling(billing), true)
  assert.equal(isDraftKeepingSendGate(forbidden), true)
  assert.equal(isDraftKeepingSendGate(billing), true)
  assert.equal(isCredentialInvalid(forbidden), false)
  assert.equal(isProviderUnreachable(billing), false)
})
