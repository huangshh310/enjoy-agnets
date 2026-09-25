import assert from "node:assert/strict"
import test from "node:test"
import { createObservationLedger, type Observation } from "./observation-ledger.ts"
import {
  DESKTOP_ACT_ANY_SESSION_KEY,
  desktopActAppKey,
  desktopActAppKeyInfo,
  desktopActApprovalText,
  desktopActBypassesSessionAllow,
  desktopActSessionKey,
  desktopActSkipsApproval,
  sessionAllowsDesktopAct,
  withAnyDesktopSessionKey
} from "./desktop-act-policy.ts"

function sample(id: string, createdAt: number): Observation {
  return {
    id,
    pid: 10,
    windowId: "w",
    appName: "Calculator",
    elements: [{ id: "e1", role: "button", name: "7", clickable: true }],
    createdAt,
    platform: "darwin"
  }
}

test("观察只能消费一次，过期和第二次都是 stale", () => {
  let now = 1_000
  const ledger = createObservationLedger({ now: () => now, ttlMs: 50 })
  ledger.put(sample("obs_a", 1_000))
  assert.equal(ledger.take("obs_a").ok, true)
  assert.equal(ledger.take("obs_a").ok, false)
  ledger.put(sample("obs_b", 1_000))
  now = 1_060
  const expired = ledger.take("obs_b")
  assert.equal(expired.ok, false)
  if (!expired.ok) assert.equal(expired.code, "stale_observation")
})

test("peek 不消费，过期 peek 为空", () => {
  let now = 1_000
  const ledger = createObservationLedger({ now: () => now, ttlMs: 50 })
  ledger.put(sample("obs_a", 1_000))
  assert.equal(ledger.peek("obs_a")?.id, "obs_a")
  assert.equal(ledger.take("obs_a").ok, true)
  assert.equal(ledger.peek("obs_a"), null)
})

test("wait 不审批，带坐标或前台仍要问", () => {
  assert.equal(desktopActSkipsApproval({ action: "wait", observationId: "obs" }), true)
  assert.equal(desktopActSkipsApproval({ action: "wait", x: 1 }), false)
  assert.equal(desktopActSkipsApproval({ action: "click", elementId: "e1" }), false)
})

test("坐标和前台动作不能被会话放行盖掉", () => {
  assert.equal(desktopActBypassesSessionAllow({ elementId: "e1", action: "click" }), false)
  assert.equal(desktopActBypassesSessionAllow({ x: 1, y: 2, action: "click" }), true)
  assert.equal(desktopActBypassesSessionAllow({ elementId: "e1", allowForeground: true }), true)
})

test("审批文案带应用、控件、前台和 appKey", () => {
  assert.equal(
    desktopActApprovalText({
      appName: "计算器",
      elementName: "等于",
      action: "click",
      allowForeground: true,
      appKey: "com.apple.calculator"
    }),
    "计算器 · 「等于」 · click · 会切到前台 · com.apple.calculator"
  )
})

test("appKey 优先 bundleId，会话键禁止裸 desktop_act", () => {
  assert.equal(desktopActAppKey({ bundleId: "com.apple.calculator", appName: "计算器" }), "com.apple.calculator")
  assert.equal(desktopActAppKeyInfo({ bundleId: "com.apple.calculator" }).appKeySource, "bundleId")
  assert.equal(desktopActAppKey({ exe: "notepad.exe", appName: "记事本" }), "notepad.exe")
  assert.equal(desktopActAppKeyInfo({ aumid: "Microsoft.Notepad_8wekyb3d8bbwe" }).appKeySource, "aumid")
  assert.equal(desktopActAppKey({ appName: "Calculator.app" }), "calculator")
  assert.equal(desktopActAppKeyInfo({ appName: "Calculator.app" }).appKeySource, "appName")
  assert.equal(desktopActSessionKey(""), null)
  assert.equal(desktopActSessionKey("com.apple.calculator"), "desktop_act:com.apple.calculator")
  assert.equal(
    sessionAllowsDesktopAct({ appKey: "com.apple.notes" }, { sessionApprovedTools: new Set(["desktop_act"]) }),
    false
  )
  assert.equal(
    sessionAllowsDesktopAct(
      { appKey: "com.apple.calculator" },
      { sessionApprovedTools: new Set(["desktop_act:com.apple.calculator"]) }
    ),
    true
  )
  assert.equal(
    sessionAllowsDesktopAct(
      { appKey: "com.apple.notes", elementId: "e1" },
      { sessionApprovedTools: new Set([DESKTOP_ACT_ANY_SESSION_KEY]) }
    ),
    true
  )
  const injected = withAnyDesktopSessionKey(new Set(["desktop_act:com.apple.calculator"]), true)
  assert.equal(injected.has(DESKTOP_ACT_ANY_SESSION_KEY), true)
  assert.equal(injected.has("desktop_act"), false)
  assert.equal(withAnyDesktopSessionKey(injected, false).has(DESKTOP_ACT_ANY_SESSION_KEY), false)
})
