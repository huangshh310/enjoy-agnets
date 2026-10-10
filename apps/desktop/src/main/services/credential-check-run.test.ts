import assert from "node:assert/strict"
import { test } from "node:test"
import {
  CREDENTIAL_CHECK_TIMEOUT_MS,
  e2eCredentialFixture,
  runCredentialCheck
} from "./credential-check-run.ts"

const profile = {
  id: "prv_1",
  kind: "openai" as const,
  apiKey: "sk-test",
  baseURL: "https://api.openai.com/v1",
  apiStyle: "openai" as const,
  modelId: "gpt-4o",
  endpoints: {},
  baseAPI: "openai" as const
}

test("夹具 ok / invalid / unverified；未打包 stub 默认 ok", () => {
  assert.deepEqual(e2eCredentialFixture({ ENJOY_E2E_STUB: "1", ENJOY_E2E_CREDENTIAL: "ok" }, false), {
    state: "ok"
  })
  assert.deepEqual(e2eCredentialFixture({ ENJOY_E2E_STUB: "1", ENJOY_E2E_CREDENTIAL: "invalid" }, false), {
    state: "invalid",
    code: "auth_rejected"
  })
  assert.deepEqual(
    e2eCredentialFixture({ ENJOY_E2E_STUB: "1", ENJOY_E2E_CREDENTIAL: "unverified" }, false),
    { state: "unverified", code: "unknown" }
  )
  assert.deepEqual(e2eCredentialFixture({ ENJOY_E2E_STUB: "1" }, false), { state: "ok" })
  assert.equal(e2eCredentialFixture({ ENJOY_E2E_STUB: "1", ENJOY_E2E_CREDENTIAL: "invalid" }, true), undefined)
})

test("401 → invalid，回包没有 HTTP 原文", async () => {
  const check = await runCredentialCheck(profile, () => "2026-10-10T00:00:00.000Z", async () =>
    new Response("{\"error\":\"Unauthorized secret\"}", { status: 401 })
  )
  assert.equal(check.state, "invalid")
  assert.equal(check.code, "auth_rejected")
  assert.equal(JSON.stringify(check).includes("Unauthorized"), false)
  assert.equal(JSON.stringify(check).includes("secret"), false)
})

test("超时 → unverified timeout", async () => {
  const err = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" })
  const check = await runCredentialCheck(profile, () => "t", async () => {
    throw err
  })
  assert.deepEqual({ state: check.state, code: check.code }, { state: "unverified", code: "timeout" })
  assert.equal(JSON.stringify(check).includes("aborted"), false)
})

test("网络失败 → unverified network", async () => {
  const check = await runCredentialCheck(profile, () => "t", async () => {
    throw Object.assign(new Error("fetch failed"), { name: "TypeError" })
  })
  assert.equal(check.state, "unverified")
  assert.equal(check.code, "network")
})

test("5xx → unverified unknown", async () => {
  const check = await runCredentialCheck(profile, () => "t", async () => new Response("oops", { status: 503 }))
  assert.equal(check.state, "unverified")
  assert.equal(check.code, "unknown")
  assert.equal(JSON.stringify(check).includes("oops"), false)
})

test("404 目录没有时改走 1 token，200 即 ok", async () => {
  let calls = 0
  const check = await runCredentialCheck(profile, () => "t", async (url) => {
    calls += 1
    if (String(url).endsWith("/models")) return new Response("", { status: 404 })
    return new Response("{}", { status: 200 })
  })
  assert.equal(calls, 2)
  assert.equal(check.state, "ok")
})

test("超时上限是 6 秒", () => {
  assert.equal(CREDENTIAL_CHECK_TIMEOUT_MS, 6_000)
})
