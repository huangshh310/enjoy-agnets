/**
 * Composer 输入框必须把全选删除接到 Chip 清理，禁止只靠 ×。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const input = readFileSync(new URL("./composer-input.tsx", import.meta.url), "utf8")
const chips = readFileSync(
  new URL("../runtime-interact/composer-quote-chips.tsx", import.meta.url),
  "utf8"
)

test("输入框全选删除清 Chip，引用 Chip 带 testid", () => {
  assert.match(input, /clear-composer-chips/)
  assert.match(input, /shouldClearComposerChipsOnDelete/)
  assert.match(input, /clearComposerDraftChips/)
  assert.match(chips, /data-testid="composer-quote-chip"/)
})
