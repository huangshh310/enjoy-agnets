/**
 * leo #145 soft：已作废的这一发即便取到空稿，也必须报 "cancelled" 而不是 null——
 * send-composer-run 的 null 分支会无条件落 running，会清掉后一发 B 占的 running。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const { resolveSendPayload } = await import("./resolve-send-payload.ts")

const snapshot = { text: "", assets: [], quotes: [], skills: [], chips: [] } as never

test("作废 + 空稿：返回 cancelled，不返回 null", async () => {
  const attempt = { text: "A", launched: false, cancelled: false, done: false, paused: false }
  const result = await resolveSendPayload(undefined, snapshot, attempt, async () => {
    attempt.cancelled = true
    return ""
  })
  assert.equal(result, "cancelled")
})

test("没作废的空稿：仍是 null", async () => {
  const result = await resolveSendPayload(undefined, snapshot, undefined, async () => "")
  assert.equal(result, null)
})
