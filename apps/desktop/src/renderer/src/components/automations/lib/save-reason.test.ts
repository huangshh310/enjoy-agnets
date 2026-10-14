import { test } from "node:test"
import assert from "node:assert/strict"
import { automationSaveReason, automationSaveReasonTone } from "./save-reason.ts"

const t = (k: string) => k
test("提示词空：名字有 → 只提提示词；名字也空 → 合并提示（luna #151）", () => {
  assert.equal(automationSaveReason({ name: "a", prompt: " " }, t), "studio.automations.promptRequired")
  assert.equal(automationSaveReason({ name: "", prompt: "" }, t), "studio.automations.namePromptRequired")
})
test("只填了提示词、名称空：提示填名称（jojo P2）", () => {
  assert.equal(automationSaveReason({ name: "", prompt: "x" }, t), "studio.automations.nameRequired")
  assert.equal(automationSaveReason({ name: "   ", prompt: "x" }, t), "studio.automations.nameRequired")
})
test("名称和提示词都有：不出原因", () => {
  assert.equal(automationSaveReason({ name: "a", prompt: "x" }, t), null)
})
test("首次打开没动过用中性语气，动过才红（luna）", () => {
  assert.equal(automationSaveReasonTone(false), "neutral")
  assert.equal(automationSaveReasonTone(true), "error")
})
