import assert from "node:assert/strict"
import { test } from "node:test"
import {
  canBindEngine,
  engineReadiness,
  isEngineLit,
  readinessMarkKey,
  readinessSubtitle
} from "./engine-readiness.ts"

test("Enjoy Local 默认就绪；明确无密钥才标需密钥", () => {
  assert.equal(engineReadiness({ id: "enjoy-local", status: "missing" }), "ready")
  assert.equal(engineReadiness({ id: "enjoy-local", status: "ready", hasKey: false }), "needs_key")
  assert.equal(engineReadiness({ id: "enjoy-local", status: "ready", hasKey: true }), "ready")
  assert.equal(canBindEngine({ id: "enjoy-local", status: "ready", hasKey: false }), true)
  assert.equal(isEngineLit({ id: "enjoy-local", status: "ready", hasKey: false }), false)
})

test("未安装只报未安装，不报协议登录", () => {
  assert.equal(engineReadiness({ id: "deepseek", status: "missing" }), "missing")
  assert.equal(readinessSubtitle("missing", (path) => path), "chat.agentNotInstalled")
})

test("已装且需要登录：未登录 / 探测中都不能当就绪", () => {
  assert.equal(
    engineReadiness({
      id: "omp",
      status: "ready",
      requiresLogin: true,
      loggedIn: false
    }),
    "needs_login"
  )
  assert.equal(
    engineReadiness({
      id: "claude",
      status: "ready",
      requiresLogin: true,
      loggedIn: null
    }),
    "inspecting"
  )
  assert.equal(
    canBindEngine({
      id: "claude",
      status: "ready",
      requiresLogin: true,
      loggedIn: false
    }),
    false
  )
  assert.equal(
    engineReadiness({
      id: "deepseek",
      status: "ready",
      requiresLogin: false,
      loggedIn: false
    }),
    "ready"
  )
  assert.equal(readinessSubtitle("needs_login", (path) => path), "chat.agentNeedsLogin")
  assert.equal(readinessSubtitle("inspecting", (path) => path), "chat.agentInspecting")
})

test("绑了 Enjoy 档案：不登官方也能就绪，缺 Key 才 needs_key", () => {
  assert.equal(
    engineReadiness({
      id: "claude",
      status: "ready",
      requiresLogin: true,
      loggedIn: false,
      usingVaultProvider: true,
      boundHasKey: true
    }),
    "ready"
  )
  assert.equal(
    canBindEngine({
      id: "claude",
      status: "ready",
      requiresLogin: true,
      loggedIn: false,
      usingVaultProvider: true,
      boundHasKey: true
    }),
    true
  )
  assert.equal(
    engineReadiness({
      id: "claude",
      status: "ready",
      requiresLogin: true,
      loggedIn: false,
      usingVaultProvider: true,
      boundHasKey: false
    }),
    "needs_key"
  )
})

test("Pi / Hermes 已装未确认登录不能当就绪；自定义无登录 PATH 找到即可", () => {
  assert.equal(
    engineReadiness({ id: "pi", status: "ready", requiresLogin: true, loggedIn: null }),
    "inspecting"
  )
  assert.equal(
    engineReadiness({ id: "hermes", status: "ready", requiresLogin: true, loggedIn: false }),
    "needs_login"
  )
  assert.equal(isEngineLit({ id: "pi", status: "ready", requiresLogin: true, loggedIn: null }), false)
  assert.equal(engineReadiness({ id: "custom:my-acp", status: "missing" }), "missing")
  assert.equal(
    engineReadiness({ id: "custom:my-acp", status: "ready", requiresLogin: false }),
    "ready"
  )
})

test("导轨胶囊用短标，就绪不画", () => {
  assert.equal(readinessMarkKey("missing"), "chat.agentNotInstalledMark")
  assert.equal(readinessMarkKey("needs_login"), "chat.agentNeedsLoginMark")
  assert.equal(readinessMarkKey("inspecting"), "chat.agentInspectingMark")
  assert.equal(readinessMarkKey("authorizing"), "chat.agentAuthorizingMark")
  assert.equal(readinessMarkKey("login_failed"), "chat.agentLoginFailedMark")
  assert.equal(readinessMarkKey("needs_key"), "chat.agentNeedsKeyMark")
  assert.equal(readinessMarkKey("soon"), "chat.agentSoonMark")
  assert.equal(readinessMarkKey("ready"), null)
})

test("仅官方四家：检测中 / 授权中 / 失败都不能当就绪灯", () => {
  for (const id of ["cursor", "grok", "antigravity", "amp"] as const) {
    assert.equal(
      engineReadiness({ id, status: "ready", requiresLogin: true, loggedIn: null }),
      "inspecting"
    )
    assert.equal(
      isEngineLit({ id, status: "ready", requiresLogin: true, loggedIn: null }),
      false
    )
    assert.equal(
      engineReadiness({
        id,
        status: "ready",
        requiresLogin: true,
        loggedIn: false,
        loginLoop: "authorizing"
      }),
      "authorizing"
    )
    assert.equal(
      canBindEngine({
        id,
        status: "ready",
        requiresLogin: true,
        loggedIn: false,
        loginLoop: "authorizing"
      }),
      false
    )
    assert.equal(
      engineReadiness({
        id,
        status: "ready",
        requiresLogin: true,
        loggedIn: false,
        loginLoop: "failed"
      }),
      "login_failed"
    )
    assert.equal(
      engineReadiness({ id, status: "ready", requiresLogin: true, loggedIn: true }),
      "ready"
    )
  }
})
