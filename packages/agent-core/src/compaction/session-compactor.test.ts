import test from "node:test"
import assert from "node:assert/strict"
import {
  applySessionCompaction,
  compactSessionMessages,
  estimateMessageTokens
} from "./session-compactor.ts"

test("returns didCompact: false when messages count <= keepRecent", () => {
  const messages = [
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi there" }
  ]
  const result = compactSessionMessages("s1", messages, { keepRecent: 4 })
  assert.equal(result.didCompact, false)
  assert.equal(result.compactedMessages.length, 2)
})

test("compacts older messages and keeps recent ones", () => {
  const messages = [
    { role: "user", content: "Please update src/app.tsx" },
    { role: "assistant", content: "Sure, updated file with new features and tests" },
    { role: "user", content: "Now fix the bug in src/utils.ts" },
    { role: "assistant", content: "Fixed the bug in src/utils.ts" },
    { role: "user", content: "Run tests" },
    { role: "assistant", content: "Tests passed successfully" }
  ]

  const result = compactSessionMessages("s1", messages, { keepRecent: 2 })
  assert.equal(result.didCompact, true)
  assert.ok(result.compaction)
  assert.equal(result.compaction?.compactedMessageCount, 4)
  assert.ok(result.compaction?.summary.includes("src/app.tsx"))
  assert.ok(result.compaction?.summary.includes("src/utils.ts"))
  assert.equal(result.compactedMessages.length, 3) // 1 summary + 2 recent
  assert.ok((result.compaction?.savedTokens ?? 0) >= 0)
})

test("applies compaction to full messages correctly", () => {
  const messages = [
    { role: "user", content: "M1" },
    { role: "assistant", content: "M2" },
    { role: "user", content: "M3" },
    { role: "assistant", content: "M4" }
  ]
  const compaction = {
    sessionId: "s1",
    summary: "Summary of M1 and M2",
    compactedMessageCount: 2,
    originalTokens: 100,
    compactedTokens: 40,
    savedTokens: 60,
    savedPercent: 60,
    compactedAt: Date.now()
  }

  const applied = applySessionCompaction(messages, compaction)
  assert.equal(applied.length, 3) // 1 SUMMARY + recent M3, M4
  assert.ok(applied[0].content.includes("[CONVERSATION SUMMARY]"))
  assert.ok(applied[0].content.includes("Summary of M1 and M2"))
  assert.equal(applied[1].content, "M3")
  assert.equal(applied[2].content, "M4")
})

test("correctly calculates estimateMessageTokens", () => {
  const messages = [
    { role: "user", content: "12345678" } // 8 chars / 3.8 ~ 2 tokens
  ]
  assert.equal(estimateMessageTokens(messages), 2)
})
