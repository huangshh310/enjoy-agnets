import assert from "node:assert/strict"
import { test } from "node:test"
import { quotaHintText } from "./use-quota-hint.ts"

test("用量文案只给悬停/Popover，没有数字则只留重置窗", () => {
  assert.equal(quotaHintText(74, "6d", (percent) => `已用 ${percent}`), "已用 74% · 6d")
  assert.equal(quotaHintText(10, undefined, (percent) => `已用 ${percent}`), "已用 10%")
  assert.equal(quotaHintText(null, "6d", (percent) => `已用 ${percent}`), "6d")
  assert.equal(quotaHintText(null, undefined, (percent) => `已用 ${percent}`), undefined)
})
