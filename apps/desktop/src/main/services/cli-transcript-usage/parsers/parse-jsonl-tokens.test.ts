/**
 * 通用 jsonl：OMP camelCase 累加；无 usage 的 Cursor 行保持 0。
 */
import assert from "node:assert/strict"
import test from "node:test"
import { parseJsonlTokenTranscript } from "./parse-jsonl-tokens.ts"

test("OMP 按行累加 camelCase usage，不把 reasoning 再加进 output", () => {
  const text = [
    JSON.stringify({
      type: "session",
      timestamp: "2026-09-06T06:37:01.840Z",
      cwd: "/Users/demo/enjoy-agnets"
    }),
    JSON.stringify({
      type: "model_change",
      timestamp: "2026-09-06T06:37:59.770Z",
      model: "google-antigravity/gemini-3.8-flash"
    }),
    JSON.stringify({
      type: "message",
      timestamp: "2026-09-06T07:04:06.924Z",
      message: {
        usage: { input: 22789, output: 937, cacheRead: 0, cacheWrite: 0, totalTokens: 23726, reasoningTokens: 643 }
      }
    }),
    JSON.stringify({
      type: "message",
      timestamp: "2026-09-06T07:10:00.000Z",
      message: {
        usage: { input: 5956, output: 422, cacheRead: 20386, cacheWrite: 0, totalTokens: 26764 }
      }
    })
  ].join("\n")
  const usage = parseJsonlTokenTranscript(text)
  assert.equal(usage.inputTokens, 22789 + 5956)
  assert.equal(usage.outputTokens, 937 + 422)
  assert.equal(usage.cacheTokens, 20386)
  assert.equal(usage.totalTokens, 23726 + 26764)
  assert.equal(usage.model, "gemini-3.8-flash")
  assert.equal(usage.project, "enjoy-agnets")
  assert.equal(usage.day, "2026-09-06")
})

test("只有 role/message 没有 usage 的 jsonl 合计为 0", () => {
  const text = `${JSON.stringify({ role: "user", message: { content: "hi" } })}\n`
  const usage = parseJsonlTokenTranscript(text)
  assert.equal(usage.totalTokens, 0)
  assert.equal(usage.inputTokens, 0)
})
