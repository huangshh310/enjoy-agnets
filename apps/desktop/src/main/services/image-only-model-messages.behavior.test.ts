/**
 * #155 leo MUST 1 / 3：只贴图不打字——这条用户句必须带着 file part 进模型。
 * 旧路径：toModelMessages 的 pruneMessages({emptyMessages:"remove"}) 删掉空正文用户句，
 * appendRunAttachments 看最后一条不是 user 就返回 []，图静默丢失。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const { importAsset } = await import("./asset-service.ts")
const { appendRunAttachments } = await import("./attach-run-files.ts")
const { toModelMessages, ATTACHMENT_ONLY_USER_TEXT, isAttachmentOnlyPlaceholder } = await import("./to-model-messages.ts")
const { withAttachmentFlags } = await import("./history-attachment-flags.ts")

const PNG_1PX = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
const caps = { vision: true, files: true }

type Part = { type: string; text?: string; filename?: string; mediaType?: string }

test("只图本轮：toModelMessages + appendRunAttachments 后最后一条用户句带 file part，不带空 text", async () => {
  const asset = await importAsset({ name: "only.png", mediaType: "image/png", bytesBase64: PNG_1PX })
  const messages = toModelMessages([{ role: "user", content: "", hasAttachments: true }])
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
    { role: "user", content: "", hasAttachments: true },
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

test("leo：用户真打了 \"[attachment]\" 再带图——正文原样发出，不被当占位吞掉", async () => {
  const asset = await importAsset({ name: "lit.png", mediaType: "image/png", bytesBase64: PNG_1PX })
  const messages = toModelMessages([{ role: "user", content: ATTACHMENT_ONLY_USER_TEXT, hasAttachments: true }])
  await appendRunAttachments(messages, [asset.id], caps)
  const parts = messages.at(-1)!.content as Part[]
  assert.deepEqual(parts.map((part) => part.type), ["text", "file"])
  assert.equal(parts[0]!.text, ATTACHMENT_ONLY_USER_TEXT)
})

test("leo：真空、不带附件的历史用户句照旧剪掉，不冒充占位发出去", () => {
  const messages = toModelMessages([
    { role: "user", content: "先说一句" },
    { role: "assistant", content: "好" },
    { role: "user", content: "" },
    { role: "user", content: "再来" }
  ])
  assert.ok(!messages.some((m) => m.content === ATTACHMENT_ONLY_USER_TEXT))
  assert.deepEqual(messages.map((m) => m.content), ["先说一句", "好", "再来"])
})

test("历史只图轮的占位发出去时不带内部标记；最后一条保留标记给编附件认", () => {
  const messages = toModelMessages([
    { role: "user", content: "", hasAttachments: true },
    { role: "assistant", content: "嗯" },
    { role: "user", content: "", hasAttachments: true }
  ])
  assert.equal(isAttachmentOnlyPlaceholder(messages[0]), false)
  assert.equal((messages[0] as { providerOptions?: unknown }).providerOptions, undefined)
  assert.equal(isAttachmentOnlyPlaceholder(messages.at(-1)), true)
})

test("withAttachmentFlags：库里有 file part 的历史句 + 带 attachments 的本轮才标 hasAttachments", () => {
  const flagged = withAttachmentFlags(
    [
      { id: "u1", role: "user", content: "" },
      { id: "u2", role: "user", content: "" },
      { id: "a1", role: "assistant", content: "x" },
      { id: "u3", role: "user", content: "" }
    ],
    new Set(["u1"]),
    1
  )
  assert.deepEqual(flagged.map((m) => Boolean(m.hasAttachments)), [true, false, false, true])
  assert.deepEqual(withAttachmentFlags([{ role: "user", content: "" }], new Set(), 0).map((m) => Boolean(m.hasAttachments)), [false])
})
