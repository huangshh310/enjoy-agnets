import assert from "node:assert/strict"
import { test } from "node:test"
import { sessionCreateDelayMs } from "./delay-session-create.ts"

test("没夹具旗标时不延迟 session.create", () => {
  assert.equal(sessionCreateDelayMs({}), 0)
  assert.equal(sessionCreateDelayMs({ ENJOY_DEV_DELAY_SESSION_CREATE_MS: "2000" }), 0)
})

test("e2e / 隔离 userData 才认延迟毫秒", () => {
  assert.equal(sessionCreateDelayMs({ ENJOY_E2E_STUB: "1", ENJOY_DEV_DELAY_SESSION_CREATE_MS: "2000" }), 2000)
  assert.equal(sessionCreateDelayMs({ ENJOY_DEV_USERDATA: "/tmp/x", ENJOY_DEV_DELAY_SESSION_CREATE_MS: "500" }), 500)
  assert.equal(sessionCreateDelayMs({ ENJOY_E2E_STUB: "1", ENJOY_DEV_DELAY_SESSION_CREATE_MS: "-1" }), 0)
})

test("打包态不延迟 session.create", () => {
  assert.equal(sessionCreateDelayMs({ ENJOY_E2E_STUB: "1", ENJOY_DEV_DELAY_SESSION_CREATE_MS: "2000" }, true), 0)
})
