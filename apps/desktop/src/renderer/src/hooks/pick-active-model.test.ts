import assert from "node:assert/strict"
import { test } from "node:test"
import { pickActiveModel } from "./pick-active-model.ts"

const openai = { id: "gpt-4.1", label: "GPT-4.1" }
const claude = { id: "claude-sonnet", label: "Claude Sonnet" }

test("空列表不选任何模型", () => {
  assert.equal(pickActiveModel([], "deepseek-chat", "deepseek-chat"), undefined)
})

test("优先保留当前已选模型", () => {
  assert.equal(pickActiveModel([openai, claude], "claude-sonnet"), claude)
})

test("当前无效时回退默认模型，再回退第一项", () => {
  assert.equal(pickActiveModel([openai, claude], "missing", "claude-sonnet"), claude)
  assert.equal(pickActiveModel([openai, claude], "missing", "also-missing"), openai)
})
