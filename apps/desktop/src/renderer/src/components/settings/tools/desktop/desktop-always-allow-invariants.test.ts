/**
 * CU-P1-A 设置文案钉：标题 / 撤销 / 空态 / 硬每次问说明。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { enSettings } from "../../../../i18n/catalogs/en/settings.ts"
import { zhSettings } from "../../../../i18n/catalogs/zh/settings.ts"

const dir = dirname(fileURLToPath(import.meta.url))
const zh = zhSettings.builtinTools
const en = enSettings.builtinTools

test("始终允许设置文案钉死：标题、撤销、空态、硬每次问", () => {
  assert.equal(zh.alwaysAllowTitle, "始终允许的应用")
  assert.equal(zh.alwaysAllowRevoke, "撤销")
  assert.match(zh.alwaysAllowEmpty, /还没有始终允许的应用/)
  assert.match(zh.alwaysAllowDesc, /坐标\/前台\/敏感仍每次问/)
  assert.match(zh.alwaysAllowFootnote, /本会话允许/)
  assert.doesNotMatch(zh.alwaysAllowRevoke, /撕掉|移除|删除|Forget/)
  assert.match(en.alwaysAllowDesc, /Coordinate \/ foreground \/ sensitive still ask every time/)
  assert.equal(en.alwaysAllowRevoke, "Revoke")
})

test("审批 always-app 不绑 approval-always；二次确认藏始终允许", () => {
  const actions = readFileSync(join(dir, "../../../ai-chat/thread/approval/approval-actions.tsx"), "utf8")
  assert.match(actions, /approval-always-app/)
  assert.match(actions, /onAllowAlways/)
  assert.match(actions, /data-testid="approval-always"/)
  assert.match(actions, /onAllowSession/)
  const card = readFileSync(join(dir, "../../../ai-chat/thread/approval/desktop-approval-card.tsx"), "utf8")
  assert.match(card, /showAlwaysApp=\{view.canAlwaysAllow\}/)
  assert.match(card, /showAlways=\{false\}/)
  assert.match(card, /SecondConfirmChrome/)
})
