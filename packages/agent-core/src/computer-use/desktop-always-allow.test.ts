/**
 * CU-P1-A：持久簿洗链、各写各的、命中顺序 A1–A6。
 */
import assert from "node:assert/strict"
import test from "node:test"
import { resolveToolApproval } from "../tool-approval.ts"
import {
  clearAllConversationDesktopAllows,
  grantConversationDesktopAllow,
  snapshotConversationDesktopAllow,
  writeThroughDesktopActSessionAllow
} from "./conversation-desktop-allow.ts"
import {
  desktopActDecisionWrite,
  grantPersistentDesktopAlwaysAllow,
  grantPersistentDesktopAppKey,
  isPersistentDesktopAppKey,
  persistentBookAllowsDesktopAct,
  policyAllowsDesktopAct,
  revokePersistentDesktopAlwaysAllow,
  sanitizeDesktopAlwaysAllowAppKeys
} from "./desktop-always-allow.ts"
import { DESKTOP_ACT_ANY_SESSION_KEY, sessionAllowsDesktopAct } from "./desktop-act-policy.ts"
import {
  clearDesktopSecondConfirmGate,
  rememberDesktopSecondConfirmGate
} from "./desktop-second-confirm-gate.ts"

const EDITS = {
  requireWriteApproval: true,
  requireBashApproval: true,
  requireCommitApproval: true
}

const CALC = "com.apple.calculator"
const NOTES = "com.apple.notes"
const CLICK_CALC = { action: "click", elementId: "e1", appKey: CALC }
const TYPE_CALC = { action: "type", elementId: "e1", appKey: CALC, text: "1" }
const KEY_CALC = { action: "key", elementId: "e1", appKey: CALC, key: "Return" }
const CLICK_NOTES = { action: "click", elementId: "e1", appKey: NOTES }

test.beforeEach(() => {
  clearAllConversationDesktopAllows()
  clearDesktopSecondConfirmGate()
})

test("洗链丢掉空、pid、带前缀、永久任意桌面", () => {
  assert.equal(isPersistentDesktopAppKey(""), false)
  assert.equal(isPersistentDesktopAppKey("*"), false)
  assert.equal(isPersistentDesktopAppKey("desktop_act:*"), false)
  assert.equal(isPersistentDesktopAppKey("desktop_act"), false)
  assert.equal(isPersistentDesktopAppKey("desktop_act:com.apple.calculator"), false)
  assert.equal(isPersistentDesktopAppKey("12345"), false)
  assert.equal(isPersistentDesktopAppKey("pid:12345"), false)
  assert.equal(isPersistentDesktopAppKey(CALC), true)
  assert.deepEqual(
    sanitizeDesktopAlwaysAllowAppKeys([
      "",
      "  ",
      "*",
      "desktop_act:*",
      "desktop_act:com.apple.calculator",
      "42",
      "pid:9",
      CALC,
      CALC,
      NOTES
    ]),
    [CALC, NOTES]
  )
})

test("写入拒绝 * / desktop_act:* / 空 / pid", () => {
  assert.equal(grantPersistentDesktopAppKey([], "*"), null)
  assert.equal(grantPersistentDesktopAppKey([], "desktop_act:*"), null)
  assert.equal(grantPersistentDesktopAppKey([], ""), null)
  assert.equal(grantPersistentDesktopAppKey([], "8080"), null)
  assert.equal(grantPersistentDesktopAppKey([CALC], "desktop_act:*"), null)
  assert.deepEqual(grantPersistentDesktopAppKey([], CALC), [CALC])
})

test("A1：簿有 X 后空会话仍放行同 appKey 的 click/type/key；wait 免批", () => {
  const policy = { ...EDITS, desktopAlwaysAllowAppKeys: [CALC] }
  assert.equal(snapshotConversationDesktopAllow("sess_new").size, 0)
  for (const act of [CLICK_CALC, TYPE_CALC, KEY_CALC]) {
    assert.equal(policyAllowsDesktopAct(act, policy), true)
    assert.equal(resolveToolApproval("desktop_act", "agent", policy, act), "approved")
  }
  assert.equal(
    resolveToolApproval("desktop_act", "agent", policy, { action: "wait", observationId: "obs" }),
    "not-applicable"
  )
})

test("A2：簿有 X 对 Y 仍要审批", () => {
  const policy = { ...EDITS, desktopAlwaysAllowAppKeys: [CALC] }
  assert.equal(policyAllowsDesktopAct(CLICK_NOTES, policy), false)
  assert.equal(resolveToolApproval("desktop_act", "agent", policy, CLICK_NOTES), "user-approval")
})

test("A3：撤销 X 后下一击要批，簿已更新", () => {
  const granted = grantPersistentDesktopAlwaysAllow([], CLICK_CALC)
  assert.deepEqual(granted, [CALC])
  const next = revokePersistentDesktopAlwaysAllow(granted ?? [], CALC)
  assert.deepEqual(next, [])
  assert.equal(policyAllowsDesktopAct(CLICK_CALC, { ...EDITS, desktopAlwaysAllowAppKeys: next }), false)
  assert.equal(
    resolveToolApproval("desktop_act", "agent", { ...EDITS, desktopAlwaysAllowAppKeys: next }, CLICK_CALC),
    "user-approval"
  )
})

test("A4：坐标 / 前台在簿仍每次问", () => {
  const policy = { ...EDITS, desktopAlwaysAllowAppKeys: [CALC] }
  assert.equal(
    policyAllowsDesktopAct({ action: "click", x: 12, y: 8, appKey: CALC }, policy),
    false
  )
  assert.equal(
    policyAllowsDesktopAct({ ...CLICK_CALC, allowForeground: true }, policy),
    false
  )
  assert.equal(
    resolveToolApproval("desktop_act", "agent", policy, { action: "click", x: 1, appKey: CALC }),
    "user-approval"
  )
})

test("A5：敏感窗在簿仍每次问", () => {
  const policy = { ...EDITS, desktopAlwaysAllowAppKeys: ["com.apple.systempreferences"] }
  const sensitive = {
    action: "click",
    elementId: "e1",
    appKey: "com.apple.systempreferences",
    appName: "系统设置"
  }
  assert.equal(policyAllowsDesktopAct(sensitive, policy), false)
  assert.equal(resolveToolApproval("desktop_act", "agent", policy, sensitive), "user-approval")
})

test("A6：二次确认不因 Always-allow 静默放行", () => {
  const click = { ...CLICK_CALC, observationId: "obs_new" }
  const policy = { ...EDITS, desktopAlwaysAllowAppKeys: [CALC] }
  assert.equal(policyAllowsDesktopAct(click, policy), true)
  rememberDesktopSecondConfirmGate("obs_new")
  assert.equal(persistentBookAllowsDesktopAct(click, [CALC]), false)
  assert.equal(policyAllowsDesktopAct(click, policy), false)
  assert.equal(resolveToolApproval("desktop_act", "agent", policy, click), "user-approval")
  assert.equal(
    policyAllowsDesktopAct({ ...click, needsSecondConfirm: true }, policy),
    false
  )
})

test("回归：allow_session 只写会话表，不升持久簿", () => {
  const write = desktopActDecisionWrite("allow_session", CLICK_CALC)
  assert.equal(write.sessionKey, "desktop_act:com.apple.calculator")
  assert.equal(write.alwaysAppKey, null)
  const run = new Set<string>()
  writeThroughDesktopActSessionAllow("sess_a", run, CLICK_CALC)
  assert.equal(run.has("desktop_act:com.apple.calculator"), true)
  assert.equal(snapshotConversationDesktopAllow("sess_a").has("desktop_act:com.apple.calculator"), true)
  assert.equal(grantPersistentDesktopAlwaysAllow([], CLICK_CALC)?.includes(CALC), true)
})

test("回归：二次确认盖住会话表与持久簿", () => {
  const click = { ...CLICK_CALC, observationId: "obs_stale" }
  grantConversationDesktopAllow("sess_a", "desktop_act:com.apple.calculator")
  const sessionPolicy = {
    ...EDITS,
    sessionApprovedTools: snapshotConversationDesktopAllow("sess_a"),
    desktopAlwaysAllowAppKeys: [CALC]
  }
  rememberDesktopSecondConfirmGate("obs_stale")
  assert.equal(sessionAllowsDesktopAct(click, sessionPolicy), false)
  assert.equal(persistentBookAllowsDesktopAct(click, [CALC]), false)
  assert.equal(policyAllowsDesktopAct(click, sessionPolicy), false)
  assert.equal(desktopActDecisionWrite("allow_always", { ...click, needsSecondConfirm: true }).alwaysAppKey, null)
  assert.equal(desktopActDecisionWrite("allow_session", { ...click, needsSecondConfirm: true }).sessionKey, null)
})

test("allow_always 不碰会话表；撤销也不碰会话表", () => {
  grantConversationDesktopAllow("sess_a", "desktop_act:com.apple.calculator")
  const write = desktopActDecisionWrite("allow_always", CLICK_CALC)
  assert.equal(write.sessionKey, null)
  assert.equal(write.alwaysAppKey, CALC)
  const book = grantPersistentDesktopAlwaysAllow([], CLICK_CALC)
  assert.deepEqual(book, [CALC])
  assert.equal(snapshotConversationDesktopAllow("sess_a").has("desktop_act:com.apple.calculator"), true)
  const afterRevoke = revokePersistentDesktopAlwaysAllow(book ?? [], CALC)
  assert.deepEqual(afterRevoke, [])
  assert.equal(snapshotConversationDesktopAllow("sess_a").has("desktop_act:com.apple.calculator"), true)
})

test("命中顺序：会话表优先于簿，硬闸优先于两者", () => {
  const sessionHit = {
    ...EDITS,
    sessionApprovedTools: new Set(["desktop_act:com.apple.notes"]),
    desktopAlwaysAllowAppKeys: [CALC]
  }
  assert.equal(policyAllowsDesktopAct(CLICK_NOTES, sessionHit), true)
  assert.equal(policyAllowsDesktopAct(CLICK_CALC, sessionHit), true)
  assert.equal(
    policyAllowsDesktopAct({ ...CLICK_NOTES, allowForeground: true }, sessionHit),
    false
  )
  assert.equal(
    policyAllowsDesktopAct(CLICK_CALC, {
      ...EDITS,
      sessionApprovedTools: new Set([DESKTOP_ACT_ANY_SESSION_KEY])
    }),
    true
  )
})
