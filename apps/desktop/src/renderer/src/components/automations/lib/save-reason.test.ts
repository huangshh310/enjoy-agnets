import { test } from "node:test"
import assert from "node:assert/strict"
import { automationSaveReason, automationSaveReasonTone, runDisabledTitle } from "./save-reason.ts"

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

test("定时为空：保存原因是「设好运行时间后才能保存」；名称 / 提示词缺失优先（jojo #154 P3）", () => {
  assert.equal(
    automationSaveReason({ name: "a", prompt: "x", triggers: ["cron"], cronExpr: " " }, t),
    "studio.automations.cronRequired"
  )
  assert.equal(automationSaveReason({ name: "", prompt: "x", triggers: ["cron"], cronExpr: "" }, t), "studio.automations.nameRequired")
  assert.equal(automationSaveReason({ name: "a", prompt: "x", triggers: ["cron"], cronExpr: "0 9 * * *" }, t), null)
  assert.equal(automationSaveReason({ name: "a", prompt: "x", triggers: ["manual"], cronExpr: "" }, t), null)
})

test("立即运行置灰 tooltip：未保存 →「先保存再运行」，已保存缺东西 → 保存原因，运行中不出", () => {
  assert.equal(runDisabledTitle({ saved: false, running: false, saveReason: null }, t), "studio.automations.saveFirstToRun")
  assert.equal(runDisabledTitle({ saved: false, running: false, saveReason: "r" }, t), "studio.automations.saveFirstToRun")
  assert.equal(runDisabledTitle({ saved: true, running: false, saveReason: "r" }, t), "r")
  assert.equal(runDisabledTitle({ saved: true, running: false, saveReason: null }, t), undefined)
  assert.equal(runDisabledTitle({ saved: true, running: true, saveReason: "r" }, t), undefined)
})
