/**
 * CU-P1-A testid 拆分：本会话 ≠ 持久。禁止旧 approval-always 接到 always-app。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const dir = dirname(fileURLToPath(import.meta.url))
const actions = readFileSync(join(dir, "approval-actions.tsx"), "utf8")
const card = readFileSync(join(dir, "desktop-approval-card.tsx"), "utf8")
const choices = readFileSync(join(dir, "desktop-approval-choice.ts"), "utf8")

test("会话钮是 approval-session，始终允许是 approval-always-app", () => {
  assert.match(actions, /data-testid="approval-session"/)
  assert.match(actions, /data-testid="approval-continue"/)
  assert.match(actions, /allowTestId = "approval-allow"/)
  assert.match(actions, /denyTestId = "approval-deny"/)
  assert.doesNotMatch(actions, /approval-always-app/)
  assert.doesNotMatch(actions, /data-testid="approval-always"/)
  assert.match(choices, /allow: "approval-allow"/)
  assert.match(choices, /allow_session: "approval-session"/)
  assert.match(choices, /allow_always: "approval-always-app"/)
  assert.match(choices, /deny: "approval-deny"/)
  assert.match(card, /footer="continue"/)
  assert.match(card, /<DesktopApprovalChoices/)
  assert.doesNotMatch(card, /approval-always-app/)
})
