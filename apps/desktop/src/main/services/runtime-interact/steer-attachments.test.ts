import assert from "node:assert/strict"
import { test } from "node:test"
import type { ModelMessage } from "ai"
import { encodeSteerTurn } from "./steer-attachments.ts"
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
