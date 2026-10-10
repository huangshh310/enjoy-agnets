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
  isProviderUnreachable,
  NO_CHAT_ROUTE,
  providerUnreachableCode
} from "./send-gate-codes.ts"

test("credential_invalid 与无路线来自合约 SendGateCode", () => {
  assert.equal(CREDENTIAL_INVALID, SendGateCode.enum.credential_invalid)
  assert.equal(NO_CHAT_ROUTE, SendGateCode.enum.no_chat_route)
  assert.equal(isCredentialInvalid(CREDENTIAL_INVALID), true)
  assert.equal(isDraftKeepingSendGate(NO_CHAT_ROUTE), true)
  assert.equal(isDraftKeepingSendGate(CREDENTIAL_INVALID), true)
})

test("provider_unreachable 从合约 ChatSendErrorCode 读", () => {
  const pinned = providerUnreachableCode()
  assert.equal(pinned, PROVIDER_UNREACHABLE)
  assert.equal(pinned, ChatSendErrorCode.enum.provider_unreachable)
  assert.equal(isProviderUnreachable(pinned), true)
  assert.equal(isDraftKeepingSendGate(pinned), true)
  assert.equal("provider_unreachable" in SendGateCode.enum, false)
})
