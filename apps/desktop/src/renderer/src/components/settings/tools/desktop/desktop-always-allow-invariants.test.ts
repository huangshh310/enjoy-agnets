/**
 * CU-P1-A 设置文案钉：标题 / 撤销 / 空态 / 坐标前台敏感。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { enSettings } from "../../../../i18n/catalogs/en/settings.ts"
import { zhSettings } from "../../../../i18n/catalogs/zh/settings.ts"

const zh = zhSettings.builtinTools
const en = enSettings.builtinTools

test("始终允许设置文案钉中英锁定", () => {
  assert.equal(zh.alwaysAllowTitle, "始终允许的应用")
  assert.equal(zh.alwaysAllowRevoke, "撤销")
  assert.equal(zh.alwaysAllowEmpty, "还没有始终允许的应用…")
  assert.match(zh.alwaysAllowDesc, /坐标\/前台\/敏感仍每次问/)
  assert.match(zh.alwaysAllowEmptyHint, /始终允许此应用/)
  assert.match(zh.alwaysAllowFootnote, /本会话允许/)
  assert.doesNotMatch(zh.alwaysAllowRevoke, /撕掉|移除|删除|Forget/)
  assert.doesNotMatch(en.alwaysAllowRevoke, /Forget|Remove|Delete|撕掉/)
  assert.match(en.alwaysAllowDesc, /Coordinates \/ foreground \/ sensitive/i)
  assert.match(en.alwaysAllowEmpty, /No always-allowed apps yet/)
})
