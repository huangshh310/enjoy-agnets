import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const split = readFileSync(join(dir, "stage-split.tsx"), "utf8")
const strip = readFileSync(
  join(dir, "../../ai-chat/attention/attention-strip.tsx"),
  "utf8"
)

test("需处理横幅浮在 Stage 顶，不给主区加 pt-12", () => {
  assert.equal(split.includes("pt-12"), false)
  assert.equal(split.includes("stripVisible"), false)
  assert.ok(split.includes("<AttentionStrip"))
  assert.ok(strip.includes("absolute top-3"))
  assert.ok(strip.includes("不占位"))
})
