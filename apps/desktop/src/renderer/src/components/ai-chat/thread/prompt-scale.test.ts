/**
 * 用户句刻度：一条不出现，两条出现，标签压成一行并截到 80 字。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { promptScaleItems } from "./prompt-scale.ts"

test("零条或一条用户消息没有刻度", () => {
  assert.deepEqual(promptScaleItems([]), [])
  assert.deepEqual(promptScaleItems([{ id: "a", role: "user", content: "hello" }]), [])
  assert.deepEqual(promptScaleItems([{ id: "a", role: "assistant", content: "hi" }, { id: "b", role: "user", content: "  " }]), [])
})

test("两条用户消息各占一格", () => {
  const items = promptScaleItems([
    { id: "u1", role: "user", content: "first" },
    { id: "a1", role: "assistant", content: "answer" },
    { id: "u2", role: "user", content: "second line" }
  ])
  assert.deepEqual(items.map((item) => item.id), ["u1", "u2"])
  assert.equal(items[1]?.label, "second line")
})

test("标签去掉换行并停在 80 字", () => {
  const long = `hello\n${"x".repeat(90)}`
  const [item] = promptScaleItems([
    { id: "u1", role: "user", content: "one" },
    { id: "u2", role: "user", content: long }
  ])
  assert.equal(item?.id, "u1")
  const second = promptScaleItems([
    { id: "u1", role: "user", content: "one" },
    { id: "u2", role: "user", content: long }
  ])[1]
  assert.equal(second?.label.length, 80)
  assert.equal(second?.label.includes("\n"), false)
})
