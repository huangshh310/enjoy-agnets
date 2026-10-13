import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import { PREVIOUS_STILL_PREPARING } from "../../../lib/usage/classify-thread-error.ts"
import { railAlreadySaysPreparing } from "./preparing-hint-dedupe.ts"

test("灰条「上一条还在准备」在时只留灰条，不叠两层（luna 3cf0）", () => {
  assert.equal(railAlreadySaysPreparing(PREVIOUS_STILL_PREPARING), true)
  assert.equal(railAlreadySaysPreparing(null), false)
  const hint = readFileSync(join(import.meta.dirname, "composer-preparing-hint.tsx"), "utf8")
  assert.match(hint, /if \(railAlreadySaysPreparing\(error\)\) return null/)
})

test("深色下灰条文字 / 图标走 text-primary（对比度 ≥ 4.5:1，luna 3cf0）", () => {
  const src = readFileSync(
    join(import.meta.dirname, "../../ai-chat/composer/runtime-interact/composer-previous-preparing-rail.tsx"),
    "utf8"
  )
  const text = src.match(/<p className="([^"]+)">\s*\{t\("chat.previousStillPreparing"\)\}/)
  assert.ok(text, "rail text <p> found")
  assert.match(text[1], /dark:text-text-primary/)
  assert.match(src, /RiInformationLine className="[^"]*dark:text-text-primary/)
  // 不用原始色板。
  assert.doesNotMatch(text[1], /neutral-\d|gray-\d|zinc-\d/)
})
