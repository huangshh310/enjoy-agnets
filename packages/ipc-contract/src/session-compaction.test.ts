import assert from "node:assert/strict"
import { test } from "node:test"
import { COMPACTION_ERROR, SessionCompactInput, SessionCompaction } from "./session-compaction.ts"

test("parses valid SessionCompactInput", () => {
  const valid = SessionCompactInput.parse({ sessionId: "ses_123", keepRecent: 4 })
  assert.equal(valid.sessionId, "ses_123")
  assert.equal(valid.keepRecent, 4)
})

test("rejects unknown fields in SessionCompactInput", () => {
  assert.throws(() => SessionCompactInput.parse({ sessionId: "ses_123", extra: true }))
})

test("parses valid SessionCompaction", () => {
  const parsed = SessionCompaction.parse({
    sessionId: "ses_1",
    summary: "[CONVERSATION SUMMARY]\nKey decisions",
    compactedMessageCount: 6,
    originalTokens: 12000,
    compactedTokens: 3000,
    savedTokens: 9000,
    savedPercent: 75,
    compactedAt: 1700000000000
  })
  assert.equal(parsed.savedPercent, 75)
})

test("exposes stable English error codes", () => {
  assert.equal(COMPACTION_ERROR.tooShort, "COMPACTION_TOO_SHORT")
  assert.equal(COMPACTION_ERROR.notEligible, "COMPACTION_NOT_ELIGIBLE")
})
