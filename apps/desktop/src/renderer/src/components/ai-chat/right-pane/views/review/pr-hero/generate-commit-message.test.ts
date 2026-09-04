import assert from "node:assert/strict"
import { test } from "node:test"
import { sanitizeCommitMessage } from "./sanitize-commit-message.ts"

test("sanitizeCommitMessage 去掉围栏和引号", () => {
  assert.equal(sanitizeCommitMessage("```\nfeat: wire git log\n```"), "feat: wire git log")
  assert.equal(sanitizeCommitMessage('"fix: parse porcelain"'), "fix: parse porcelain")
})

test("sanitizeCommitMessage 截到八行", () => {
  const lines = Array.from({ length: 12 }, (_, i) => `line ${i}`)
  const next = sanitizeCommitMessage(lines.join("\n"))
  assert.equal(next.split("\n").length, 8)
})
