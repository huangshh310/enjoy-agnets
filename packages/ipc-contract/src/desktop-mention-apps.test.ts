import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
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

test("RunAgentInput 声明可选 desktopBias（node:test 不 value-import chat.ts）", () => {
  const src = readFileSync(new URL("./chat.ts", import.meta.url), "utf8")
  assert.match(src, /desktopBias: DesktopMentionBias\.optional/)
  assert.match(src, /clearSessionAllow: z\.boolean\(\)\.optional/)
})
