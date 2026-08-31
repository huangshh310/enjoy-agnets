/**
 * Extract 形状与生图 prompt。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { asExtractObject, buildExtractPrompt, extractKind } from "./extract-object-shape.ts"

test("认出 title/summary/items，丢掉空 items", () => {
  const parsed = asExtractObject({
    title: " 大熊 ",
    summary: "一只抱枕的熊",
    items: ["bear", " ", 1, "pillow"]
  })
  assert.deepEqual(parsed, {
    title: "大熊",
    summary: "一只抱枕的熊",
    items: ["bear", "pillow"]
  })
  assert.equal(asExtractObject({ foo: 1 }), null)
})

test("生图轮按 generation 写 prompt，不当助手正文", () => {
  assert.equal(extractKind("", true), "generation")
  assert.equal(extractKind("hello", true), "reply")
  const prompt = buildExtractPrompt("大熊的呢", "generation")
  assert.match(prompt, /User request/)
  assert.doesNotMatch(prompt, /assistant reply/)
})
