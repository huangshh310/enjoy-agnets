import assert from "node:assert/strict"
import { test } from "node:test"
import { joinInstructions } from "./join-instructions.ts"

test("没有 extra 时原样返回", () => {
  assert.equal(joinInstructions("base"), "base")
  assert.equal(joinInstructions("base", "  "), "base")
})

test("有 extra 时空行拼接", () => {
  assert.equal(joinInstructions("base", "tail"), "base\n\ntail")
})
