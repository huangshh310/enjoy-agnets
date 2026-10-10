import assert from "node:assert/strict"
import { test } from "node:test"
import {
  CREDENTIAL_INVALID,
  CredentialCheck,
  CredentialCheckCode,
  catalogMissingStatus,
  classifyCredentialFailure,
  classifyCredentialStatus,
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
