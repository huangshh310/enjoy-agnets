/**
 * 登录回执只展示设备码与状态文案，禁止把授权 URL / token 摊到 UI。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { displayLoginMessage, isAwaitingCallback, loginHintFor } from "./cli-login-hint.ts"

const t = (path: string, vars?: Record<string, string>) =>
  vars?.code ? `${path}:${vars.code}` : path

test("设备码优先于笼统的已打开授权", () => {
  assert.equal(loginHintFor("device:AB12-CD34", true, t), "chat.cliProviderLoginDevice:AB12-CD34")
  assert.equal(loginHintFor("browser_opened", true, t), "chat.cliProviderLoginStarted")
  assert.equal(loginHintFor("logged_in", true, t), "chat.cliProviderLoginDone")
  assert.equal(loginHintFor("callback_timeout", false, t), "chat.cliProviderLoginTimeout")
  assert.equal(loginHintFor("needs_tui", false, t), "chat.cliProviderLoginNeedsTui")
  assert.equal(loginHintFor("failed", false, t), "chat.cliProviderLoginFailed")
  assert.equal(isAwaitingCallback("browser_opened"), true)
  assert.equal(isAwaitingCallback("device:AB12-CD34"), true)
  assert.equal(isAwaitingCallback("logged_in"), false)
  assert.equal(displayLoginMessage("logged_in", t), "chat.cliProviderLoginDone")
  assert.equal(displayLoginMessage("Login started. Finish authorization in the browser or CLI window.", t), "Login started. Finish authorization in the browser or CLI window.")
  assert.equal(loginHintFor("https://github.com/login/device", true, t), "chat.cliProviderLoginFailed")
  assert.equal(displayLoginMessage("https://evil.example/?access_token=x", t), "chat.cliProviderLoginFailed")
})
