/**
 * 设置搜索：向导 / 入门 / 引导都要命中通用。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { SETTINGS_NAV_DEF } from "./settings-catalog-nav.ts"

test("通用 keywords 含向导入门引导", () => {
  const general = SETTINGS_NAV_DEF.flatMap((group) => group.items).find((item) => item.id === "general")
  assert.ok(general)
  for (const word of ["向导", "入门", "引导"]) {
    assert.ok(general.keywords.includes(word), `missing ${word}`)
  }
})
