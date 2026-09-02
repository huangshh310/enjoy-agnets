import assert from "node:assert/strict"
import { test } from "node:test"
import {
  clearInspectPromptSnapshots,
  getInspectPromptSnapshot,
  rememberInspectPrompt,
  sanitizeModelMessages
} from "./inspect-prompt-snapshot.ts"

test("sanitizeModelMessages omits file bytes", () => {
  const rows = sanitizeModelMessages([
    {
      role: "user",
      content: [
        { type: "text", text: "see" },
        { type: "file", mediaType: "image/png", data: Buffer.from("abc") }
      ]
    }
  ])
  const filePart = (rows[0]?.content as Array<Record<string, unknown>>)[1]
  assert.equal(filePart?.data, "[omitted]")
  assert.equal(filePart?.mediaType, "image/png")
})

test("rememberInspectPrompt is keyed by session", () => {
  clearInspectPromptSnapshots()
  rememberInspectPrompt({
    source: "last-run",
    capturedAt: 1,
    sessionId: "ses_a",
    modelId: "m",
    mode: "agent",
    runtime: "local",
    instructions: "sys",
    messages: [{ role: "user", content: "hi" }],
    toolNames: ["read_file"]
  })
  assert.equal(getInspectPromptSnapshot("ses_a")?.instructions, "sys")
  assert.equal(getInspectPromptSnapshot("ses_b"), undefined)
})
