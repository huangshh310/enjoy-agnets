import test from "node:test"
import assert from "node:assert/strict"
import { RunAgentInput } from "./chat.ts"
import { DesktopMentionApp, DesktopMentionAppsResult } from "./desktop-mention-apps.ts"

test("稳应用行收 displayName + appKey，pid 只可选", () => {
  const row = DesktopMentionApp.parse({
    displayName: "计算器",
    appKey: "com.apple.calculator",
    appKeySource: "bundleId",
    stable: true
  })
  assert.equal(row.appKey, "com.apple.calculator")
  assert.equal(row.pid, undefined)
})

test("无稳键行必须 stable=false 且 appKey 空", () => {
  const row = DesktopMentionApp.parse({
    displayName: "未识别窗口",
    appKey: "",
    stable: false,
    pid: 18422
  })
  assert.equal(row.stable, false)
  assert.equal(row.appKey, "")
})

test("列表失败仍是空 apps，不造假应用", () => {
  const parsed = DesktopMentionAppsResult.parse({
    ok: false,
    apps: [],
    code: "executor_missing"
  })
  assert.equal(parsed.apps.length, 0)
})

const RUN_BASE = {
  sessionId: "sess",
  workspaceId: "ws",
  modelId: "model",
  messages: [{ role: "user" as const, content: "@桌面 打开" }]
}

test("agent.run 可带 desktopBias，缺省兼容旧入参", () => {
  assert.equal(RunAgentInput.parse(RUN_BASE).desktopBias, undefined)
  assert.deepEqual(RunAgentInput.parse({ ...RUN_BASE, desktopBias: { kind: "host" } }).desktopBias, {
    kind: "host"
  })
  assert.deepEqual(
    RunAgentInput.parse({
      ...RUN_BASE,
      desktopBias: {
        kind: "app",
        displayName: "计算器",
        appKey: "com.apple.calculator",
        stable: true
      }
    }).desktopBias,
    { kind: "app", displayName: "计算器", appKey: "com.apple.calculator", stable: true }
  )
})
