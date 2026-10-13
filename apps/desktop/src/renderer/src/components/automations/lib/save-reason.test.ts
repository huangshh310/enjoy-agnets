import { test } from "node:test"
import assert from "node:assert/strict"
import { automationSaveReason } from "./save-reason.ts"

const t = (k: string) => k
test("提示词空：名字有 → 只提提示词；名字也空 → 合并提示（luna #151）", () => {
  assert.equal(automationSaveReason({ name: "a", prompt: " " }, t), "studio.automations.promptRequired")
  assert.equal(automationSaveReason({ name: "", prompt: "" }, t), "studio.automations.namePromptRequired")
})
test("提示词有：不出原因", () => {
  assert.equal(automationSaveReason({ name: "", prompt: "x" }, t), null)
})
