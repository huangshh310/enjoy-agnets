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

test("luna 只图发送：正文空但有附件（排队续发 prepared）→ 照发，content 为空、带附件", async () => {
  const result = await resolveSendPayload(
    { content: "", assets: [{ id: "ast_png", name: "shot.png", mediaType: "image/png" }] },
    snapshot
  )
  assert.ok(result && result !== "cancelled")
  assert.equal(result.content, "")
  assert.deepEqual(result.assetIds, ["ast_png"])
  assert.equal(result.messageAssets[0]?.mediaType, "image/png")
})

test("luna 只图发送：输入框只贴了图 → 照发并取走附件", async () => {
  const { clearComposerAssets, listComposerAssets, setComposerAssets } = await import("../composer-assets.ts")
  setComposerAssets([{ id: "ast_draft_png", name: "a.png", mediaType: "image/png" }])
  const result = await resolveSendPayload(undefined, snapshot, undefined, async () => "")
  assert.ok(result && result !== "cancelled")
  assert.deepEqual(result.assetIds, ["ast_draft_png"])
  assert.equal(listComposerAssets().length, 0)
  clearComposerAssets()
})
