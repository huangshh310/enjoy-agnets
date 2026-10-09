/**
 * CU-P1-S：会话表是 desktop_act 会话 Allow 的 SoT（policy B）。
 */
import assert from "node:assert/strict"
import test from "node:test"
import { resolveToolApproval } from "../tool-approval.ts"
import {
  clearAllConversationDesktopAllows,
  clearConversationDesktopAllow,
  conversationHasAnyDesktop,
  grantConversationDesktopAllow,
  isConversationDesktopAllowKey,
  mergeConversationDesktopAllow,
  overlayConversationDesktopAllow,
  revokeConversationDesktopAllow,
  setConversationAnyDesktop,
  snapshotConversationDesktopAllow,
  stripAnyDesktopSessionAllow,
  writeThroughDesktopActSessionAllow
} from "./conversation-desktop-allow.ts"
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

const CALC = "desktop_act:com.apple.calculator"
const NOTES = "desktop_act:com.apple.notes"
const CLICK_CALC = { action: "click", elementId: "e1", appKey: "com.apple.calculator" }

test.beforeEach(() => {
  clearAllConversationDesktopAllows()
  clearDesktopSecondConfirmGate()
})

test("只认 desktop_act:<appKey> 与 desktop_act:*，拒绝裸 desktop_act", () => {
  assert.equal(isConversationDesktopAllowKey(CALC), true)
  assert.equal(isConversationDesktopAllowKey(DESKTOP_ACT_ANY_SESSION_KEY), true)
  assert.equal(isConversationDesktopAllowKey("desktop_act"), false)
  assert.equal(isConversationDesktopAllowKey("desktop_act:"), false)
  assert.equal(isConversationDesktopAllowKey("write_file"), false)
  assert.equal(grantConversationDesktopAllow("sess_a", "desktop_act"), false)
  assert.equal(snapshotConversationDesktopAllow("sess_a").has("desktop_act"), false)
  assert.equal(grantConversationDesktopAllow("sess_a", "desktop_act:"), false)
})

test("Allow AppX 后同一会话下一轮仍放行", () => {
  const run1 = snapshotConversationDesktopAllow("sess_a")
  writeThroughDesktopActSessionAllow("sess_a", run1, CLICK_CALC)
  assert.equal(sessionAllowsDesktopAct(CLICK_CALC, { sessionApprovedTools: run1 }), true)
  const run2 = snapshotConversationDesktopAllow("sess_a")
  assert.equal(run2.has(CALC), true)
  assert.equal(sessionAllowsDesktopAct(CLICK_CALC, { sessionApprovedTools: run2 }), true)
  assert.equal(
    resolveToolApproval("desktop_act", "agent", { ...EDITS, sessionApprovedTools: run2 }, CLICK_CALC),
    "approved"
  )
})

test("切到会话 B 再回来，A 仍记得 Allow（policy B）", () => {
  grantConversationDesktopAllow("sess_a", CALC)
  assert.equal(snapshotConversationDesktopAllow("sess_b").size, 0)
  assert.equal(snapshotConversationDesktopAllow("sess_a").has(CALC), true)
  assert.equal(
    sessionAllowsDesktopAct(CLICK_CALC, { sessionApprovedTools: snapshotConversationDesktopAllow("sess_a") }),
    true
  )
})

test("删除或归档会话后必须重新审批", () => {
  grantConversationDesktopAllow("sess_a", CALC)
  clearConversationDesktopAllow("sess_a")
  const next = snapshotConversationDesktopAllow("sess_a")
  assert.equal(next.has(CALC), false)
  assert.equal(sessionAllowsDesktopAct(CLICK_CALC, { sessionApprovedTools: next }), false)
  assert.equal(
    resolveToolApproval("desktop_act", "agent", { ...EDITS, sessionApprovedTools: next }, CLICK_CALC),
    "user-approval"
  )
})

test("anyDesktop 默认关、同生命周期、不进其它会话", () => {
  assert.equal(conversationHasAnyDesktop("sess_a"), false)
  assert.equal(setConversationAnyDesktop("sess_a", true), true)
  assert.equal(conversationHasAnyDesktop("sess_a"), true)
  assert.equal(conversationHasAnyDesktop("sess_b"), false)
  const run = snapshotConversationDesktopAllow("sess_a")
  assert.equal(run.has(DESKTOP_ACT_ANY_SESSION_KEY), true)
  assert.equal(
    sessionAllowsDesktopAct(
      { action: "click", elementId: "e1", appKey: "com.apple.notes" },
      { sessionApprovedTools: run }
    ),
    true
  )
  setConversationAnyDesktop("sess_a", false)
  assert.equal(conversationHasAnyDesktop("sess_a"), false)
  assert.equal(snapshotConversationDesktopAllow("sess_a").has(DESKTOP_ACT_ANY_SESSION_KEY), false)
})

test("显式撤销应用或关掉 anyDesktop 立刻摘键", () => {
  grantConversationDesktopAllow("sess_a", CALC)
  grantConversationDesktopAllow("sess_a", NOTES)
  setConversationAnyDesktop("sess_a", true)
  const run = snapshotConversationDesktopAllow("sess_a")
  overlayConversationDesktopAllow("sess_a", run)
  revokeConversationDesktopAllow("sess_a", CALC)
  overlayConversationDesktopAllow("sess_a", run)
  assert.equal(run.has(CALC), false)
  assert.equal(run.has(NOTES), true)
  assert.equal(run.has(DESKTOP_ACT_ANY_SESSION_KEY), true)
  setConversationAnyDesktop("sess_a", false)
  overlayConversationDesktopAllow("sess_a", run)
  assert.equal(run.has(DESKTOP_ACT_ANY_SESSION_KEY), false)
  assert.equal(run.has(NOTES), true)
})

test("run 结束不清会话表；进程清表才全丢", () => {
  grantConversationDesktopAllow("sess_a", CALC)
  const finished = snapshotConversationDesktopAllow("sess_a")
  finished.clear()
  assert.equal(snapshotConversationDesktopAllow("sess_a").has(CALC), true)
  clearAllConversationDesktopAllows()
  assert.equal(snapshotConversationDesktopAllow("sess_a").size, 0)
})

test("无 appKey 的 write-through 不写表", () => {
  const run = new Set<string>()
  assert.equal(writeThroughDesktopActSessionAllow("sess_a", run, { action: "click", elementId: "e1" }), null)
  assert.equal(run.size, 0)
  assert.equal(snapshotConversationDesktopAllow("sess_a").size, 0)
})

test("会话已允许 appKey 或任意桌面时二次确认仍要审批，禁止直接 act", () => {
  const click = { ...CLICK_CALC, observationId: "obs_new" }
  const appKeyPolicy = { ...EDITS, sessionApprovedTools: new Set([CALC]) }
  const anyPolicy = { ...EDITS, sessionApprovedTools: new Set([DESKTOP_ACT_ANY_SESSION_KEY]) }
  assert.equal(sessionAllowsDesktopAct(click, appKeyPolicy), true)
  assert.equal(resolveToolApproval("desktop_act", "agent", appKeyPolicy, click), "approved")

  rememberDesktopSecondConfirmGate("obs_new")
  assert.equal(sessionAllowsDesktopAct(click, appKeyPolicy), false)
  assert.equal(resolveToolApproval("desktop_act", "agent", appKeyPolicy, click), "user-approval")
  assert.equal(sessionAllowsDesktopAct(click, anyPolicy), false)
  assert.equal(resolveToolApproval("desktop_act", "agent", anyPolicy, click), "user-approval")
  assert.equal(
    resolveToolApproval("desktop_act", "agent", { ...EDITS, anyDesktopSession: true }, click),
    "user-approval"
  )

  clearDesktopSecondConfirmGate()
  assert.equal(
    resolveToolApproval(
      "desktop_act",
      "agent",
      appKeyPolicy,
      { ...click, needsSecondConfirm: true }
    ),
    "user-approval"
  )
  assert.equal(sessionAllowsDesktopAct({ ...click, needsSecondConfirm: true }, anyPolicy), false)
})

test("stripAnyDesktop 只摘 *，按应用键留下", () => {
  const stripped = stripAnyDesktopSessionAllow(new Set([CALC, DESKTOP_ACT_ANY_SESSION_KEY, "write_file"]))
  assert.equal(stripped.has(DESKTOP_ACT_ANY_SESSION_KEY), false)
  assert.equal(stripped.has(CALC), true)
  assert.equal(stripped.has("write_file"), true)
})

test("merge 只读会话表 ∪ run 副本，丢掉裸 desktop_act，不造全局开关", () => {
  grantConversationDesktopAllow("sess_a", CALC)
  const merged = mergeConversationDesktopAllow("sess_a", new Set(["desktop_act", "write_file"]))
  assert.equal(merged.has(CALC), true)
  assert.equal(merged.has("write_file"), true)
  assert.equal(merged.has("desktop_act"), false)
  setConversationAnyDesktop("sess_a", true)
  const starred = mergeConversationDesktopAllow("sess_a", new Set())
  assert.equal(starred.has(DESKTOP_ACT_ANY_SESSION_KEY), true)
  assert.equal(starred.has("desktop_act"), false)
})
