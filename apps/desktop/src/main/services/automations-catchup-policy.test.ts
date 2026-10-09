/**
 * 补跑审批：不吃 desktop_act:*，按应用放行与簿照常，敏感仍每次问。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveToolApproval } from "../../../../../packages/agent-core/src/tool-approval.ts"
import {
  DESKTOP_ACT_ANY_SESSION_KEY,
  desktopActIsSensitive,
  persistentAlwaysAllowsDesktopAct,
  sessionAllowsDesktopAct
} from "../../../../../packages/agent-core/src/computer-use/desktop-act-policy.ts"
import { stripAnyDesktopSessionAllow } from "../../../../../packages/agent-core/src/computer-use/conversation-desktop-allow.ts"

const EDITS = {
  requireWriteApproval: true,
  requireBashApproval: true,
  requireCommitApproval: true
}

const NOTES = { action: "click", elementId: "e1", appKey: "com.apple.notes", appName: "备忘录", sensitive: false }
const TERM = { action: "click", elementId: "e1", appKey: "com.apple.Terminal", appName: "终端" }

test("M5 补跑丢掉任意桌面，按应用会话放行仍有效", () => {
  const inherited = new Set([DESKTOP_ACT_ANY_SESSION_KEY, "desktop_act:com.apple.notes"])
  const catchUp = stripAnyDesktopSessionAllow(inherited)
  assert.equal(catchUp.has(DESKTOP_ACT_ANY_SESSION_KEY), false)
  assert.equal(sessionAllowsDesktopAct(NOTES, { sessionApprovedTools: inherited, anyDesktopSession: true }), true)
  assert.equal(sessionAllowsDesktopAct(NOTES, { sessionApprovedTools: catchUp, anyDesktopSession: false }), true)
  const starredOnly = stripAnyDesktopSessionAllow(new Set([DESKTOP_ACT_ANY_SESSION_KEY]))
  assert.equal(sessionAllowsDesktopAct(NOTES, { sessionApprovedTools: starredOnly, anyDesktopSession: false }), false)
  assert.equal(
    resolveToolApproval("desktop_act", "agent", { ...EDITS, sessionApprovedTools: starredOnly }, NOTES),
    "user-approval"
  )
})

test("M5 敏感终端缺 sensitive 字段仍每次问；簿按应用照常", () => {
  assert.equal(desktopActIsSensitive(TERM), true)
  assert.equal("sensitive" in TERM, false)
  const perApp = { sessionApprovedTools: new Set(["desktop_act:com.apple.Terminal"]), anyDesktopSession: false }
  assert.equal(sessionAllowsDesktopAct(TERM, perApp), false)
  assert.equal(sessionAllowsDesktopAct(NOTES, { sessionApprovedTools: new Set(["desktop_act:com.apple.notes"]) }), true)
  assert.equal(persistentAlwaysAllowsDesktopAct(NOTES, ["com.apple.notes"]), true)
  assert.equal(persistentAlwaysAllowsDesktopAct(TERM, ["com.apple.Terminal"]), false)
  assert.equal(resolveToolApproval("desktop_act", "agent", { ...EDITS, ...perApp }, TERM), "user-approval")
})
