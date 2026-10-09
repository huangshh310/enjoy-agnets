import assert from "node:assert/strict"
import { test } from "node:test"
import { displayThinkingLabel } from "./thinking-label.ts"

const zh: Record<string, string> = {
  "chat.working": "工作中",
  "chat.thinking": "思考中",
  "chat.waitingForApp": "等待应用…",
  "chat.toolDesktop": "操作桌面",
  "chat.thinkingSources": "来源"
}

function t(key: string) {
  return zh[key] ?? key
}

test("审批等待用人话，不露 Waiting for approval", () => {
  assert.equal(displayThinkingLabel("Waiting for approval", t), "等待应用…")
})

test("desktop act 默认显示操作桌面", () => {
  assert.equal(displayThinkingLabel("desktop act", t), "操作桌面")
  assert.equal(displayThinkingLabel("desktop_act", t), "操作桌面")
})

test("Sources 默认显示来源", () => {
  assert.equal(displayThinkingLabel("Sources", t), "来源")
})

test("Thinking 默认显示思考中", () => {
  assert.equal(displayThinkingLabel("Thinking", t), "思考中")
})
