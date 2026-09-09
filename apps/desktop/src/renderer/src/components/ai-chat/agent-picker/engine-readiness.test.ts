import assert from "node:assert/strict"
import { test } from "node:test"
import { engineReadiness, readinessMarkKey, readinessSubtitle } from "./engine-readiness.ts"

test("Enjoy Local 恒为就绪，不写副标题", () => {
  assert.equal(engineReadiness({ id: "enjoy-local", status: "missing" }), "ready")
  assert.equal(readinessSubtitle("ready", (path) => path), "")
})

test("未安装只报未安装，不报协议登录", () => {
  assert.equal(engineReadiness({ id: "deepseek", status: "missing" }), "missing")
  assert.equal(readinessSubtitle("missing", (path) => path), "chat.agentNotInstalled")
})

test("已装且明确未登录才写需登录；inspect 未回不猜", () => {
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
    "ready"
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
})

test("导轨胶囊用短标，就绪不画", () => {
  assert.equal(readinessMarkKey("missing"), "chat.agentNotInstalledMark")
  assert.equal(readinessMarkKey("needs_login"), "chat.agentNeedsLoginMark")
  assert.equal(readinessMarkKey("soon"), "chat.agentSoonMark")
  assert.equal(readinessMarkKey("ready"), null)
})
