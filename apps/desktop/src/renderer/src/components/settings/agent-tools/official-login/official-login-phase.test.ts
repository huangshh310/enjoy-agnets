/**
 * 仅官方四家：检测中 / 授权中 ≠ 已就绪；失败仍走官方登录前缀。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  officialLoginRowPhase,
  overridesOfficialListReady,
  showsOfficialConfigure
} from "./official-login-phase.ts"

const FOUR = ["cursor", "grok", "antigravity", "amp"] as const

test("Cursor/Grok/Antigravity/Amp 检测中不是已就绪", () => {
  for (const runtimeId of FOUR) {
    const phase = officialLoginRowPhase({
      runtimeId,
      pathReady: true,
      canLogin: true,
      loggedIn: null
    })
    assert.equal(phase, "check")
    assert.equal(overridesOfficialListReady(phase), true)
  }
})

test("打开授权中 ≠ 已登录，主槽不能设为主引擎", () => {
  for (const runtimeId of FOUR) {
    const phase = officialLoginRowPhase({
      runtimeId,
      pathReady: true,
      canLogin: true,
      loggedIn: false,
      loginLoop: "authorizing"
    })
    assert.equal(phase, "auth")
    assert.equal(overridesOfficialListReady(phase), true)
  }
})

test("inspect 确认后才是已登录", () => {
  for (const runtimeId of FOUR) {
    assert.equal(
      officialLoginRowPhase({
        runtimeId,
        pathReady: true,
        canLogin: true,
        loggedIn: true,
        loginLoop: "authorizing"
      }),
      "in"
    )
  }
})

test("失败仍是官方登录行，不是 vault", () => {
  const phase = officialLoginRowPhase({
    runtimeId: "amp",
    pathReady: true,
    canLogin: true,
    loggedIn: false,
    loginLoop: "failed"
  })
  assert.equal(phase, "fail")
  assert.equal(overridesOfficialListReady(phase), true)
})

test("检测中 / 授权中不画配置，已登录与失败才留 ⚙", () => {
  assert.equal(showsOfficialConfigure("check"), false)
  assert.equal(showsOfficialConfigure("auth"), false)
  assert.equal(showsOfficialConfigure("in"), true)
  assert.equal(showsOfficialConfigure("fail"), true)
})

test("可绑 Claude 不走仅官方密表四态", () => {
  assert.equal(
    officialLoginRowPhase({
      runtimeId: "claude",
      pathReady: true,
      canLogin: true,
      loggedIn: false
    }),
    "idle"
  )
})
