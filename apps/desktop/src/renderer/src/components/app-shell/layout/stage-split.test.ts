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
  assert.match(header, /min-w-0 flex-1 overflow-hidden/)
  assert.doesNotMatch(header, /min-w-\[12rem\]/)
  assert.match(header, /chat-breadcrumb-project/)
  assert.match(header, /chat-breadcrumb-title/)
  assert.match(header, /min-w-\[4\.5rem\] max-w-\[60%\] shrink-0/)
})

test("待验收闸不缩，先裁会话题", () => {
  const gate = readFileSync(
    join(dir, "../../ai-chat/review-gate/review-gate-header.tsx"),
    "utf8"
  )
  assert.match(gate, /shrink-0 whitespace-nowrap/)
  assert.match(header, /ml-auto flex shrink-0/)
  assert.match(header, /chat-breadcrumb-title/)
  assert.match(header, /block truncate/)
  assert.match(header, /min-w-0 flex-1 overflow-hidden/)
})
