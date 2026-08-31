import assert from "node:assert/strict"
import { test } from "node:test"
import { translateAudio } from "./generate.ts"

test("无效翻译模型隔离失败，返回 null 不抛给 UI", async () => {
  const text = await translateAudio({}, new Uint8Array([1, 2, 3]))
  assert.equal(text, null)
})
