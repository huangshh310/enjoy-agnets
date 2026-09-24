/**
 * 头尾截断：短文本不动，长文本必须同时留下开头和结尾。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { clipToolPayload, clipToolText } from "./clip-tool-text.ts"

test("短字符串和空字符串原样返回", () => {
  assert.equal(clipToolText("", 10), "")
  assert.equal(clipToolText("hello", 10), "hello")
})

test("超限时保留头尾并写明省掉的中间长度", () => {
  const value = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const clipped = clipToolText(value, 10)
  assert.equal(clipped.startsWith("ABCDE"), true)
  assert.equal(clipped.endsWith("VWXYZ"), true)
  assert.match(clipped, /omitted 16 chars/)
})

test("MCP 形状只截断长文本，短字段和数字不动", () => {
  const long = "S".repeat(20) + "TAIL"
  const clipped = clipToolPayload(
    { content: [{ type: "text", text: long }], ok: true, count: 3, note: "short" },
    10
  ) as {
    content: Array<{ type: string; text: string }>
    ok: boolean
    count: number
    note: string
  }
  assert.equal(clipped.content[0]?.type, "text")
  assert.match(clipped.content[0]?.text ?? "", /omitted/)
  assert.equal(clipped.content[0]?.text.endsWith("TAIL"), true)
  assert.equal(clipped.ok, true)
  assert.equal(clipped.count, 3)
  assert.equal(clipped.note, "short")
})

test("深过 6 层的字符串不再截断", () => {
  const leaf = "Z".repeat(40)
  let nested: unknown = leaf
  for (let i = 0; i < 7; i += 1) nested = { child: nested }
  const clipped = clipToolPayload(nested, 10) as { child: unknown }
  let cursor: unknown = clipped
  for (let i = 0; i < 7; i += 1) {
    cursor = (cursor as { child: unknown }).child
  }
  assert.equal(cursor, leaf)
})
