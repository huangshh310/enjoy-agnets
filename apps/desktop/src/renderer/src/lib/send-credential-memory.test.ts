import assert from "node:assert/strict"
import { test } from "node:test"
import {
  noteSendCredentialFromStream,
  noteSendCredentialOutcome,
  rememberedSendCredential,
  resetSendCredentialMemory
} from "./send-credential-memory.ts"

test("发送结果记忆：ok / invalid / 网络不改", () => {
  resetSendCredentialMemory()
  noteSendCredentialOutcome("ok")
  assert.deepEqual(rememberedSendCredential(), { state: "ok" })
  noteSendCredentialOutcome("invalid")
  assert.deepEqual(rememberedSendCredential(), { state: "invalid", code: "auth_rejected" })
  noteSendCredentialOutcome("unchanged")
  assert.equal(rememberedSendCredential()?.state, "invalid")
})

test("流事件：enjoy-local 成功写 ok，被拒写 invalid，网络不改", () => {
  resetSendCredentialMemory()
  noteSendCredentialFromStream({ type: "run.end" }, { error: null }, "enjoy-local")
  assert.equal(rememberedSendCredential()?.state, "ok")
  noteSendCredentialFromStream({ type: "run.error" }, { error: "credential_invalid" }, "enjoy-local")
  assert.equal(rememberedSendCredential()?.state, "invalid")
  noteSendCredentialFromStream({ type: "run.error" }, { error: "provider_unreachable" }, "enjoy-local")
  assert.equal(rememberedSendCredential()?.state, "invalid")
  resetSendCredentialMemory()
  noteSendCredentialFromStream({ type: "run.error" }, { error: "provider_forbidden" }, "enjoy-local")
  assert.deepEqual(rememberedSendCredential(), { state: "unverified", code: "forbidden" })
  noteSendCredentialFromStream({ type: "run.error" }, { error: "provider_billing" }, "enjoy-local")
  assert.deepEqual(rememberedSendCredential(), { state: "unverified", code: "billing" })
  resetSendCredentialMemory()
  noteSendCredentialFromStream({ type: "run.end" }, { error: null }, "claude")
  assert.equal(rememberedSendCredential(), undefined)
})
