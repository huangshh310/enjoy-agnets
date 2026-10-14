import assert from "node:assert/strict"
import { test } from "node:test"
import { composerCanSend } from "./composer-can-send.ts"

test("composerCanSend：正文 / 附件 / Chip 任一即可发；全空才不能发", () => {
  assert.equal(composerCanSend({ text: "hi" }), true)
  assert.equal(composerCanSend({ text: "", assetCount: 1 }), true)
  assert.equal(composerCanSend({ text: "  \n", assetCount: 2 }), true)
  assert.equal(composerCanSend({ text: "", hasChips: true }), true)
  assert.equal(composerCanSend({ text: "   " }), false)
  assert.equal(composerCanSend({ text: "", assetCount: 0, hasChips: false }), false)
})

test("行为：取稿组 payload——只图（正文空）照发，图带上；全空返回 null（不发）", async () => {
  ;(globalThis as { window?: unknown }).window ??= {}
  const { resolveSendPayload } = await import("./resolve-send-payload.ts")
  const snap = { text: "" } as never
  const img = { id: "asset_1", name: "a.png", mediaType: "image/png", size: 1, url: "blob:a" }
  const sent = await resolveSendPayload({ content: "", assets: [img] as never }, snap, undefined, async () => "")
  assert.ok(sent && sent !== "cancelled")
  assert.deepEqual(sent.assetIds, ["asset_1"])
  assert.equal(sent.content, "")
  assert.equal(await resolveSendPayload({ content: "  ", assets: [] }, snap, undefined, async () => ""), null)
})

test("messageHasBody：有字或带附件都算内容，空字无附件不算", async () => {
  const { messageHasBody } = await import("./composer-can-send.ts")
  assert.equal(messageHasBody({ content: "", assets: [{}] }), true)
  assert.equal(messageHasBody({ content: "hi" }), true)
  assert.equal(messageHasBody({ content: "  ", assets: [] }), false)
})
