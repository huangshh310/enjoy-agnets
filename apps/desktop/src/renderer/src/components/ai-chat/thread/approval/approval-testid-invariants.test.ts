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

test("会话钮是 approval-session，始终允许是 approval-always-app", () => {
  assert.match(actions, /data-testid="approval-session"/)
  assert.match(actions, /data-testid="approval-always-app"/)
  assert.match(actions, /data-testid="approval-allow"/)
  assert.match(actions, /data-testid="approval-deny"/)
  assert.doesNotMatch(actions, /data-testid="approval-always"/)
  assert.match(card, /showAlwaysApp=\{false\}/)
})
