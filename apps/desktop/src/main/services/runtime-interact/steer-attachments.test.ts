import assert from "node:assert/strict"
import { test } from "node:test"
import type { ModelMessage } from "ai"
import { encodeSteerTurn, performSteer } from "./steer-attachments.ts"
import { steerToModelMessages } from "./steering-queue.ts"

const fakeAppend = async (messages: ModelMessage[], ids: string[]) => {
  const text = messages[0]!.content as string
  messages[0] = {
    role: "user",
    content: [
      ...(text ? [{ type: "text" as const, text }] : []),
      ...ids.map((id) => ({ type: "file" as const, mediaType: "image/png", filename: `${id}.png`, data: new Uint8Array([1]) }))
    ]
  }
  return ids.map((assetId) => ({ assetId, mediaType: "image/png", name: `${assetId}.png` }))
}

test("jojo #155 P1：带图纠偏——图编进 user 消息，落库元数据带上", async () => {
  const out = await encodeSteerTurn("看这张", ["ast_1"], fakeAppend)
  assert.deepEqual(out.attached.map((a) => a.assetId), ["ast_1"])
  const [msg] = steerToModelMessages([{ id: "s", text: "看这张", ...(out.content ? { content: out.content } : {}) }])
  assert.ok(Array.isArray(msg!.content), "模型收到的是 parts，不是只有文字")
  assert.deepEqual((msg!.content as Array<{ type: string }>).map((p) => p.type), ["text", "file"])
})

test("只图纠偏也能发；不带图时仍是纯文字", async () => {
  const only = await encodeSteerTurn("", ["ast_2"], fakeAppend)
  assert.deepEqual((only.content as Array<{ type: string }>).map((p) => p.type), ["file"])
  const plain = await encodeSteerTurn("停", undefined, fakeAppend)
  assert.equal(plain.content, undefined)
  assert.deepEqual(steerToModelMessages([{ id: "s", text: "停" }]), [{ role: "user", content: "停" }])
})

function deps() {
  const persisted: Array<{ text: string; ids: string[] }> = []
  const queued: Array<{ text: string; content?: unknown }> = []
  return {
    persisted,
    queued,
    d: {
      append: fakeAppend,
      persist: (_s: string, text: string, attached: Array<{ assetId: string }>) =>
        void persisted.push({ text, ids: attached.map((a) => a.assetId) }),
      enqueue: (_s: string, item: { text: string; content?: unknown }) => void queued.push(item),
      newId: () => "steer_1"
    }
  }
}

test("performSteer：落库带附件元数据，纠偏队列拿到带图 content", async () => {
  const { persisted, queued, d } = deps()
  await performSteer({ sessionId: "s", text: "看这张", attachments: ["ast_1"] }, "enjoy-local", d)
  assert.deepEqual(persisted, [{ text: "看这张", ids: ["ast_1"] }])
  assert.ok(Array.isArray(queued[0]?.content))
})

test("leo MUST 2：ACP 运行时带图纠偏被拒（不落库、不入队）；纯文字照常", async () => {
  const { persisted, queued, d } = deps()
  await assert.rejects(
    performSteer({ sessionId: "s", text: "", attachments: ["ast_1"] }, "claude", d),
    /STEER_IMAGES_UNSUPPORTED/
  )
  assert.equal(persisted.length + queued.length, 0)
  await performSteer({ sessionId: "s", text: "停" }, "claude", d)
  assert.equal(queued.length, 1)
})
