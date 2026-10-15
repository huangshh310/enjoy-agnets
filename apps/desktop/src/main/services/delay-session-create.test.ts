import assert from "node:assert/strict"
import { test } from "node:test"
import { sessionCreateDelayMs, sessionMessagesDelayMs, sessionMessagesFault } from "./delay-session-create.ts"

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

test("session.messages 延迟只认 e2e / 隔离 userData，打包态不延迟", () => {
  assert.equal(sessionMessagesDelayMs({ ENJOY_DEV_DELAY_SESSION_MESSAGES_MS: "2000" }), 0)
  assert.equal(sessionMessagesDelayMs({ ENJOY_E2E_STUB: "1", ENJOY_DEV_DELAY_SESSION_MESSAGES_MS: "2000" }), 2000)
  assert.equal(sessionMessagesDelayMs({ ENJOY_E2E_STUB: "1", ENJOY_DEV_DELAY_SESSION_MESSAGES_MS: "99999" }), 10_000)
  assert.equal(sessionMessagesDelayMs({ ENJOY_E2E_STUB: "1", ENJOY_DEV_DELAY_SESSION_MESSAGES_MS: "2000" }, true), 0)
})

test("session.messages 故障注入只在 e2e / dev userData 下生效，打包态恒关", () => {
  assert.equal(sessionMessagesFault({ ENJOY_E2E_SESSION_MESSAGES_FAULT: "error" }), null)
  assert.equal(sessionMessagesFault({ ENJOY_E2E_STUB: "1", ENJOY_E2E_SESSION_MESSAGES_FAULT: "error" }), "error")
  assert.equal(sessionMessagesFault({ ENJOY_E2E_STUB: "1", ENJOY_E2E_SESSION_MESSAGES_FAULT: "hang" }), "hang")
  assert.equal(sessionMessagesFault({ ENJOY_E2E_STUB: "1", ENJOY_E2E_SESSION_MESSAGES_FAULT: "boom" }), null)
  assert.equal(sessionMessagesFault({ ENJOY_E2E_STUB: "1", ENJOY_E2E_SESSION_MESSAGES_FAULT: "error" }, true), null)
})
