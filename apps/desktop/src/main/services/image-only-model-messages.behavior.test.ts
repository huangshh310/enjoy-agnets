/**
 * #155 leo MUST 1 / 3：只贴图不打字——这条用户句必须带着 file part 进模型。
 * 旧路径：toModelMessages 的 pruneMessages({emptyMessages:"remove"}) 删掉空正文用户句，
 * appendRunAttachments 看最后一条不是 user 就返回 []，图静默丢失。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const { importAsset } = await import("./asset-service.ts")
const { appendRunAttachments } = await import("./attach-run-files.ts")
const { toModelMessages, ATTACHMENT_ONLY_USER_TEXT } = await import("./to-model-messages.ts")

const PNG_1PX = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
const caps = { vision: true, files: true }

type Part = { type: string; text?: string; filename?: string; mediaType?: string }

test("只图本轮：toModelMessages + appendRunAttachments 后最后一条用户句带 file part，不带空 text", async () => {
  const asset = await importAsset({ name: "only.png", mediaType: "image/png", bytesBase64: PNG_1PX })
  const messages = toModelMessages([{ role: "user", content: "" }])
  assert.equal(messages.at(-1)?.role, "user")
  const attached = await appendRunAttachments(messages, [asset.id], caps)
  assert.deepEqual(attached.map((item) => item.assetId), [asset.id])
  const parts = messages.at(-1)!.content as Part[]
  assert.ok(Array.isArray(parts))
  assert.deepEqual(parts.map((part) => part.type), ["file"])
  assert.equal(parts[0]!.filename, "only.png")
  assert.equal(parts[0]!.mediaType, "image/png")
})

test("历史里的只图轮不被删：前后两轮助手不会连在一起", () => {
  const messages = toModelMessages([
    { role: "user", content: "先说一句" },
    { role: "assistant", content: "好" },
    { role: "user", content: "" },
    { role: "assistant", content: "看到图了" },
    { role: "user", content: "再来" }
  ])
  assert.deepEqual(
    messages.map((m) => m.role),
    ["user", "assistant", "user", "assistant", "user"]
  )
  assert.equal(messages[2]!.content, ATTACHMENT_ONLY_USER_TEXT)
})

test("有字带图：保留正文 text，再接 file part", async () => {
  const asset = await importAsset({ name: "b.png", mediaType: "image/png", bytesBase64: PNG_1PX })
  const messages = toModelMessages([{ role: "user", content: "看这张" }])
  await appendRunAttachments(messages, [asset.id], caps)
  const parts = messages.at(-1)!.content as Part[]
  assert.deepEqual(parts.map((part) => part.type), ["text", "file"])
  assert.equal(parts[0]!.text, "看这张")
})
