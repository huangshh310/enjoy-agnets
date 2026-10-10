import assert from "node:assert/strict"
import { test } from "node:test"
import {
  CREDENTIAL_CHECK_TIMEOUT_MS,
  catalogUrlForCheck,
  e2eCredentialFixture,
  runCredentialCheck
} from "./credential-check-run.ts"

const isolated = { ENJOY_E2E_STUB: "1", ENJOY_E2E_USERDATA: "/tmp/e2e-ud" }

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

test("夹具要隔离 userData；STUB 单独不默认 ok", () => {
  assert.equal(e2eCredentialFixture({ ENJOY_E2E_STUB: "1" }, false), undefined)
  assert.deepEqual(e2eCredentialFixture({ ...isolated, ENJOY_E2E_CREDENTIAL: "ok" }, false), {
    state: "ok"
  })
  assert.deepEqual(e2eCredentialFixture({ ...isolated, ENJOY_E2E_CREDENTIAL: "invalid" }, false), {
    state: "invalid",
    code: "auth_rejected"
  })
  assert.deepEqual(e2eCredentialFixture({ ...isolated, ENJOY_E2E_CREDENTIAL: "unverified" }, false), {
    state: "unverified",
    code: "unknown"
  })
  assert.deepEqual(
    e2eCredentialFixture({ ...isolated, ENJOY_E2E_CREDENTIAL: "unverified:network" }, false),
    { state: "unverified", code: "network" }
  )
  assert.deepEqual(
    e2eCredentialFixture({ ...isolated, ENJOY_E2E_CREDENTIAL: "unverified:timeout" }, false),
    { state: "unverified", code: "timeout" }
  )
  assert.equal(e2eCredentialFixture({ ...isolated }, false), undefined)
  assert.equal(e2eCredentialFixture({ ...isolated, ENJOY_E2E_CREDENTIAL: "invalid" }, true), undefined)
})

test("403 → unverified/forbidden，不拦发送", async () => {
  const check = await runCredentialCheck(profile, () => "t", async () => new Response("", { status: 403 }))
  assert.equal(check.state, "unverified")
  assert.equal(check.code, "forbidden")
})

test("401 → invalid，回包没有 HTTP 原文", async () => {
  const check = await runCredentialCheck(profile, () => "2026-10-10T00:00:00.000Z", async () =>
    new Response("{\"error\":\"Unauthorized secret\"}", { status: 401 })
  )
  assert.equal(check.state, "invalid")
  assert.equal(check.code, "auth_rejected")
  assert.equal(JSON.stringify(check).includes("Unauthorized"), false)
})

test("超时 → unverified timeout", async () => {
  const err = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" })
  const check = await runCredentialCheck(profile, () => "t", async () => {
    throw err
  })
  assert.deepEqual({ state: check.state, code: check.code }, { state: "unverified", code: "timeout" })
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
})

test("404/405 直接 unverified，不再 1 token", async () => {
  let calls = 0
  const check = await runCredentialCheck(profile, () => "t", async () => {
    calls += 1
    return new Response("", { status: 404 })
  })
  assert.equal(calls, 1)
  assert.equal(check.state, "unverified")
  assert.equal(check.code, "unknown")
})

test("3xx 当 unverified，且用 redirect:manual", async () => {
  let redirect: RequestRedirect | undefined
  const check = await runCredentialCheck(profile, () => "t", async (_url, init) => {
    redirect = init?.redirect
    return new Response("", { status: 302, headers: { location: "https://evil.example/models" } })
  })
  assert.equal(redirect, "manual")
  assert.equal(check.state, "unverified")
  assert.equal(check.code, "unknown")
})

test("modelsURL 跨站时不用它", () => {
  const url = catalogUrlForCheck({
    ...profile,
    modelsURL: "https://evil.example/models"
  })
  assert.equal(url?.includes("evil.example"), false)
  assert.ok(url?.includes("api.openai.com"))
})

test("超时上限是 6 秒", () => {
  assert.equal(CREDENTIAL_CHECK_TIMEOUT_MS, 6_000)
})
