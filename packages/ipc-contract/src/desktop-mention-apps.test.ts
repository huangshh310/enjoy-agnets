import test from "node:test"
import assert from "node:assert/strict"
import {
  DesktopMentionApp,
  DesktopMentionAppsResult,
  DesktopMentionBias
} from "./desktop-mention-apps.ts"

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

test("DesktopMentionBias 宿主 / 稳应用 / 无稳键", () => {
  assert.deepEqual(DesktopMentionBias.parse({ kind: "host" }), { kind: "host" })
  assert.deepEqual(
    DesktopMentionBias.parse({
      kind: "app",
      displayName: "计算器",
      appKey: "com.apple.calculator",
      stable: true
    }),
    { kind: "app", displayName: "计算器", appKey: "com.apple.calculator", stable: true }
  )
  assert.equal(
    DesktopMentionBias.parse({
      kind: "app",
      displayName: "未识别窗口",
      appKey: "",
      stable: false
    }).stable,
    false
  )
})

test("RunAgentInput：desktopBias / clearSessionAllow / clientRequestId 可选且按 schema 校验", async () => {
  const { RunAgentInput } = await import("./chat.ts")
  const { CLIENT_REQUEST_ID_MAX } = await import("./pre-output-failure.ts")
  const base = { sessionId: "s", workspaceId: "w", modelId: "m", messages: [{ role: "user", content: "hi" }] }
  assert.equal(RunAgentInput.safeParse(base).success, true)
  const ok = RunAgentInput.parse({ ...base, clearSessionAllow: true, clientRequestId: "req-1" })
  assert.equal(ok.clientRequestId, "req-1")
  assert.equal(ok.clearSessionAllow, true)
  assert.equal(RunAgentInput.safeParse({ ...base, clientRequestId: "" }).success, false)
  assert.equal(
    RunAgentInput.safeParse({ ...base, clientRequestId: "x".repeat(CLIENT_REQUEST_ID_MAX + 1) }).success,
    false
  )
  assert.equal(RunAgentInput.safeParse({ ...base, clearSessionAllow: "yes" }).success, false)
  assert.equal(RunAgentInput.safeParse({ ...base, desktopBias: 42 }).success, false)
})
