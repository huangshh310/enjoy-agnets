import assert from "node:assert/strict"
import { test } from "node:test"
import {
  CREDENTIAL_INVALID,
  ChatSendErrorCode,
  CredentialCheck,
  CredentialCheckCode,
  PROVIDER_UNREACHABLE,
  catalogMissingStatus,
  classifyChatSendFailure,
  classifyCredentialFailure,
  classifyCredentialStatus,
  credentialCheckAfterAuthRejected,
  credentialCheckAfterOkSend,
  parseCredentialCheck
} from "./credential-check.ts"

test("缺字段 / 坏字段回 unverified，不抛", () => {
  assert.deepEqual(parseCredentialCheck(undefined), { state: "unverified" })
  assert.deepEqual(parseCredentialCheck({ state: "nope" }), { state: "unverified" })
  assert.deepEqual(parseCredentialCheck({ state: "ok", http: "401 Unauthorized" }), {
    state: "unverified"
  })
})

test("显式三态保留，多余字段丢掉整份当 unverified", () => {
  assert.equal(CredentialCheck.parse({ state: "ok" }).state, "ok")
  assert.equal(CredentialCheck.parse({ state: "invalid", code: "auth_rejected" }).state, "invalid")
  assert.equal(CredentialCheck.parse({ state: "unverified", code: "timeout" }).code, "timeout")
})

test("401/403 → invalid；5xx / 其它 → unverified；从不带原文", () => {
  assert.deepEqual(classifyCredentialStatus(401), { state: "invalid", code: "auth_rejected" })
  assert.deepEqual(classifyCredentialStatus(403), { state: "invalid", code: "auth_rejected" })
  assert.deepEqual(classifyCredentialStatus(500), { state: "unverified", code: "unknown" })
  assert.deepEqual(classifyCredentialStatus(502), { state: "unverified", code: "unknown" })
  assert.deepEqual(classifyCredentialStatus(200), { state: "ok" })
  const classified = classifyCredentialStatus(401)
  assert.equal(JSON.stringify(classified).includes("Unauthorized"), false)
})

test("失败只回稳定码", () => {
  assert.deepEqual(classifyCredentialFailure("timeout"), { state: "unverified", code: "timeout" })
  assert.deepEqual(classifyCredentialFailure("network"), { state: "unverified", code: "network" })
  assert.deepEqual(classifyCredentialFailure("unknown"), { state: "unverified", code: "unknown" })
  assert.deepEqual(CredentialCheckCode.options, ["auth_rejected", "network", "timeout", "unknown"])
})

test("404/405 当没目录", () => {
  assert.equal(catalogMissingStatus(404), true)
  assert.equal(catalogMissingStatus(405), true)
  assert.equal(catalogMissingStatus(401), false)
})

test("发送闸码 credential_invalid 是独立字符串", () => {
  assert.equal(CREDENTIAL_INVALID, "credential_invalid")
})

test("跑中失败码是 Zod 枚举，不含 HTTP 原文", () => {
  assert.deepEqual(ChatSendErrorCode.options, [CREDENTIAL_INVALID, PROVIDER_UNREACHABLE])
  assert.equal(ChatSendErrorCode.safeParse("401 Unauthorized").success, false)
  assert.equal(ChatSendErrorCode.parse(CREDENTIAL_INVALID), CREDENTIAL_INVALID)
})

test("首发 401/403 → credential_invalid 且要落盘 invalid", () => {
  assert.deepEqual(classifyChatSendFailure({ status: 401 }), {
    code: CREDENTIAL_INVALID,
    persistInvalid: true
  })
  assert.deepEqual(classifyChatSendFailure({ status: 403 }), {
    code: CREDENTIAL_INVALID,
    persistInvalid: true
  })
  const at = "2026-10-10T00:00:00.000Z"
  assert.deepEqual(credentialCheckAfterAuthRejected(at), {
    state: "invalid",
    code: "auth_rejected",
    checkedAt: at
  })
})

test("正文里的 401 字样 / errorClass auth 不得落盘 invalid", () => {
  assert.equal(classifyChatSendFailure({ message: "This request used 140100 tokens" }), null)
  assert.equal(
    classifyChatSendFailure({ message: "API key does not have access to model" }),
    null
  )
  assert.equal(classifyChatSendFailure({ errorClass: "auth" }), null)
  assert.equal(classifyChatSendFailure({ message: "401 Unauthorized" }), null)
})

test("网络 / 超时 → provider_unreachable，不改落盘", () => {
  assert.deepEqual(classifyChatSendFailure({ errorClass: "timeout" }), {
    code: PROVIDER_UNREACHABLE,
    persistInvalid: false
  })
  assert.deepEqual(classifyChatSendFailure({ message: "ECONNREFUSED 127.0.0.1" }), {
    code: PROVIDER_UNREACHABLE,
    persistInvalid: false
  })
  assert.deepEqual(classifyChatSendFailure({ message: "fetch failed" }), {
    code: PROVIDER_UNREACHABLE,
    persistInvalid: false
  })
})

test("一次成功发送写成 ok，带 checkedAt / verifiedAt", () => {
  const at = "2026-10-10T00:00:00.000Z"
  assert.deepEqual(credentialCheckAfterOkSend(at), {
    state: "ok",
    checkedAt: at,
    verifiedAt: at
  })
})
