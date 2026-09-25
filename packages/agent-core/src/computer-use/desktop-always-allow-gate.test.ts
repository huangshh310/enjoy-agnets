/**
 * CU-P1-A 闸：硬每次问 → 会话表 → 持久簿投影 appKey[]。
 * A1–A6 与会话 / allow_always 回归。
 */
import assert from "node:assert/strict"
import test from "node:test"
import { resolveToolApproval, type ApprovalPolicy } from "../tool-approval.ts"
import {
  DESKTOP_ACT_ANY_SESSION_KEY,
  persistentAlwaysAllowsDesktopAct,
  sessionAllowsDesktopAct
} from "./desktop-act-policy.ts"
import {
  clearDesktopSecondConfirmGate,
  rememberDesktopSecondConfirmGate
} from "./desktop-second-confirm-gate.ts"

const EDITS: ApprovalPolicy = {
  requireWriteApproval: true,
  requireBashApproval: true,
  requireCommitApproval: true
}

const CALC = "com.apple.calculator"
const NOTES = "com.apple.Notes"
const CLICK_CALC = { action: "click", elementId: "e1", appKey: CALC }
const TYPE_CALC = { action: "type", elementId: "e1", appKey: CALC, text: "1" }
const KEY_CALC = { action: "key", elementId: "e1", appKey: CALC, key: "enter" }
const CLICK_NOTES = { action: "click", elementId: "e1", appKey: NOTES }

function bookPolicy(keys: readonly string[], session?: ReadonlySet<string>): ApprovalPolicy {
  return { ...EDITS, desktopAlwaysAllowAppKeys: keys, sessionApprovedTools: session }
}

function decide(args: unknown, policy: ApprovalPolicy) {
  return resolveToolApproval("desktop_act", "agent", policy, args)
}

test.beforeEach(() => {
  clearDesktopSecondConfirmGate()
})

test("A1 簿有 X 且会话空：普通 click/type/key 自动放行", () => {
  const policy = bookPolicy([CALC])
  assert.equal(decide(CLICK_CALC, policy), "approved")
  assert.equal(decide(TYPE_CALC, policy), "approved")
  assert.equal(decide(KEY_CALC, policy), "approved")
  assert.equal(sessionAllowsDesktopAct(CLICK_CALC, policy), false)
  assert.equal(persistentAlwaysAllowsDesktopAct(CLICK_CALC, [CALC]), true)
})

test("A2 簿有 X 对 Y 仍要问", () => {
  assert.equal(decide(CLICK_NOTES, bookPolicy([CALC])), "user-approval")
  assert.equal(persistentAlwaysAllowsDesktopAct(CLICK_NOTES, [CALC]), false)
})

test("A3 撤销 X 后下一次要问", () => {
  const before = bookPolicy([CALC, NOTES])
  assert.equal(decide(CLICK_CALC, before), "approved")
  const afterRevoke = bookPolicy([NOTES])
  assert.equal(decide(CLICK_CALC, afterRevoke), "user-approval")
  assert.equal(persistentAlwaysAllowsDesktopAct(CLICK_CALC, afterRevoke.desktopAlwaysAllowAppKeys ?? []), false)
})

test("A4 坐标/前台即使簿命中仍要问", () => {
  const policy = bookPolicy([CALC])
  assert.equal(decide({ action: "click", x: 1, y: 2, appKey: CALC }, policy), "user-approval")
  assert.equal(
    decide({ action: "click", elementId: "e1", allowForeground: true, appKey: CALC }, policy),
    "user-approval"
  )
  assert.equal(persistentAlwaysAllowsDesktopAct({ action: "click", x: 1, y: 2, appKey: CALC }, [CALC]), false)
})

test("A5 敏感窗即使簿命中仍要问", () => {
  const sensitive = { action: "click", elementId: "e1", appKey: CALC, appName: "系统设置" }
  assert.equal(decide(sensitive, bookPolicy([CALC])), "user-approval")
  assert.equal(persistentAlwaysAllowsDesktopAct(sensitive, [CALC]), false)
})

test("A6 二次确认即使簿命中仍要问，禁止静默 click", () => {
  const policy = bookPolicy([CALC])
  const flagged = { ...CLICK_CALC, needsSecondConfirm: true, observationId: "obs_new" }
  assert.equal(decide(flagged, policy), "user-approval")
  assert.equal(decide({ ...CLICK_CALC, code: "needs_second_confirm" }, policy), "user-approval")
  rememberDesktopSecondConfirmGate("obs_stash")
  assert.equal(decide({ ...CLICK_CALC, observationId: "obs_stash" }, policy), "user-approval")
  assert.equal(persistentAlwaysAllowsDesktopAct(flagged, [CALC]), false)
})

test("回归：会话 Allow 仍放行；簿键 * / desktop_act:* 不当持久允许", () => {
  const session = bookPolicy([], new Set([`desktop_act:${CALC}`]))
  assert.equal(decide(CLICK_CALC, session), "approved")
  assert.equal(decide(CLICK_NOTES, session), "user-approval")
  const any = bookPolicy([], new Set([DESKTOP_ACT_ANY_SESSION_KEY]))
  assert.equal(decide(CLICK_NOTES, any), "approved")
  assert.equal(decide(CLICK_CALC, bookPolicy(["*", "desktop_act:*", `desktop_act:${CALC}`])), "user-approval")
  assert.equal(persistentAlwaysAllowsDesktopAct(CLICK_CALC, ["*", "desktop_act:*"]), false)
})

test("命中顺序：硬每次问先于会话表与簿", () => {
  const both = bookPolicy([CALC], new Set([`desktop_act:${CALC}`, DESKTOP_ACT_ANY_SESSION_KEY]))
  assert.equal(decide({ ...CLICK_CALC, needsSecondConfirm: true }, both), "user-approval")
  assert.equal(decide({ action: "click", x: 8, appKey: CALC }, both), "user-approval")
  assert.equal(decide(CLICK_CALC, both), "approved")
})