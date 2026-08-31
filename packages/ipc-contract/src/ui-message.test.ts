import assert from "node:assert/strict"
import { test } from "node:test"
import {
  isGenerativeComponentId,
  migrateContentToParts,
  safeValidateUIMessages,
  validateUIMessages
} from "./ui-message.ts"

test("旧文本消息迁到 text part", () => {
  const parts = migrateContentToParts("hello")
  assert.deepEqual(parts, [{ type: "text", text: "hello" }])
})

test("validateUIMessages 接受合法 parts", () => {
  const messages = validateUIMessages([
    {
      id: "m1",
      role: "user",
      parts: [{ type: "text", text: "hi" }]
    }
  ])
  assert.equal(messages.length, 1)
  assert.equal(messages[0]?.parts[0]?.type, "text")
})

test("safeValidateUIMessages 非法输入返回空", () => {
  assert.deepEqual(safeValidateUIMessages("nope"), [])
})

test("生成式 UI 只允许白名单 componentId", () => {
  assert.equal(isGenerativeComponentId("card"), true)
  assert.equal(isGenerativeComponentId("DangerousRemote"), false)
})
