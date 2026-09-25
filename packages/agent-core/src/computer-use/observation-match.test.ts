import assert from "node:assert/strict"
import test from "node:test"
import type { Observation } from "./observation-ledger.ts"
import {
  DESKTOP_ACT_STALE,
  desktopActFailureCode,
  desktopActMayReportSuccess,
  desktopAppKey,
  matchResnapElement,
  resolveListedAppPid
} from "./observation-match.ts"

function observation(overrides: Partial<Observation> = {}): Observation {
  return {
    id: "obs_new",
    pid: 42,
    windowId: "42",
    appName: "Calculator",
    elements: [{ id: "0.1", role: "AXButton", name: "等于", clickable: true }],
    createdAt: 1,
    platform: "darwin",
    ...overrides
  }
}

test("appKey 优先 bundleId，再 exe，最后规范化 appName", () => {
  assert.equal(desktopAppKey({ bundleId: "com.apple.calculator", appName: "计算器" }), "com.apple.calculator")
  assert.equal(desktopAppKey({ exe: "Calc.exe", appName: "计算器" }), "calc.exe")
  assert.equal(desktopAppKey({ appName: "  Calculator  " }), "calculator")
})

test("重拍匹配：同 appKey + role+name，路径 id 只作辅证", () => {
  const next = observation()
  assert.equal(
    matchResnapElement(next, {
      appName: "Calculator",
      elementId: "0.1",
      elementRole: "AXButton",
      elementName: "等于"
    })?.id,
    "0.1"
  )
  assert.equal(
    matchResnapElement(next, { appName: "Calculator", elementId: "gone", elementRole: "AXButton", elementName: "等于" })
      ?.id,
    "0.1"
  )
  assert.equal(matchResnapElement(next, { appName: "Notes", elementId: "0.1", elementName: "等于" }), null)
  assert.equal(
    matchResnapElement(next, { appName: "Calculator", elementId: "9.9", elementRole: "AXButton", elementName: "清除" }),
    null
  )
})

test("同路径 id 但 name/role 变了不得匹配", () => {
  const next = observation()
  assert.equal(
    matchResnapElement(next, {
      appName: "Calculator",
      elementId: "0.1",
      elementRole: "AXButton",
      elementName: "清除"
    }),
    null
  )
  assert.equal(
    matchResnapElement(next, { appName: "Calculator", elementId: "0.1", elementRole: "AXStaticText", elementName: "等于" }),
    null
  )
})

test("只有路径 id、没有 role/name 视为弱身份，不静默匹配", () => {
  assert.equal(matchResnapElement(observation(), { appName: "Calculator", elementId: "0.1" }), null)
})

test("空 appKey 或没有控件稳定键不得匹配", () => {
  assert.equal(matchResnapElement(observation({ appName: "" }), { appName: "", elementId: "0.1" }), null)
  assert.equal(matchResnapElement(observation(), { appName: "Calculator" }), null)
})

test("list_apps 按 appKey 找 pid，对不上才回落原 pid", () => {
  const listed = { apps: [{ pid: 99, name: "Calculator" }, { pid: 7, name: "Notes" }] }
  assert.equal(resolveListedAppPid(listed, { appName: "Calculator", pid: 42 }), 99)
  assert.equal(resolveListedAppPid({ apps: [] }, { appName: "Calculator", pid: 42 }), 42)
  assert.equal(resolveListedAppPid({ apps: [] }, { appName: "Calculator" }), undefined)
})

test("resume 结果：只有 success===true 才能报成功", () => {
  assert.equal(desktopActMayReportSuccess({ success: true }), true)
  assert.equal(desktopActMayReportSuccess({ success: true, code: "action_failed" }), false)
  assert.equal(desktopActMayReportSuccess({ success: false, code: DESKTOP_ACT_STALE }), false)
  assert.equal(desktopActMayReportSuccess(null), false)
  assert.equal(desktopActFailureCode({}), DESKTOP_ACT_STALE)
  assert.equal(desktopActFailureCode({ success: false, code: "needs_second_confirm" }), "needs_second_confirm")
})
