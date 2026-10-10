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
const header = readFileSync(join(dir, "../chat/chat-stage-header.tsx"), "utf8")
const stage = readFileSync(join(dir, "../chat/chat-stage.tsx"), "utf8")

test("已完成进顶栏状态区，需处理占标题栏下一行，不盖标题", () => {
  assert.equal(split.includes("pt-12"), false)
  assert.equal(split.includes("<AttentionStrip"), false)
  assert.ok(header.includes("AttentionCompleteStatus"))
  assert.ok(stage.includes("AttentionNeedsBar"))
  assert.ok(strip.includes("attention-needs-bar"))
  assert.ok(strip.includes("attention-complete-status"))
  assert.equal(strip.includes("absolute top-3"), false)
  assert.equal(strip.includes("inset-x-0"), false)
  assert.match(header, /text-text-secondary/)
  assert.match(header, /run-ledger-toggle/)
  assert.doesNotMatch(header, /text-text-tertiary/)
  assert.doesNotMatch(header, /text-foreground-icon-secondary/)
})
