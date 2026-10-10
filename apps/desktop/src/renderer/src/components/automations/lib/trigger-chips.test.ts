import assert from "node:assert/strict"
import { test } from "node:test"
import type { Automation } from "@enjoy-agents/ipc-contract"
import { listTriggerChips, toggleTrigger, webhookPortReady } from "./trigger-chips.ts"

test("徽章区分手动 / cron / 保存后 / webhook 端口", () => {
  const base = { name: "x", prompt: "y", enabled: true, updatedAt: 1 }
  assert.equal(listTriggerChips({ ...base, id: "1", trigger: "manual" } as Automation)[0]?.kind, "manual")
  assert.equal(
    listTriggerChips({ ...base, id: "2", trigger: "cron", cronExpr: "0 9 * * *" } as Automation)[0]?.text,
    "0 9 * * *"
  )
  assert.equal(listTriggerChips({ ...base, id: "3", trigger: "on_save" } as Automation)[0]?.kind, "on_save")
  assert.equal(
    listTriggerChips({ ...base, id: "4", trigger: "webhook", webhookPort: 8765 } as Automation)[0]?.text,
    "8765"
  )
})

test("保存后与 webhook 徽章可并存", () => {
  const chips = listTriggerChips({
    id: "5",
    name: "写盘后复盘",
    prompt: "y",
    trigger: "on_save",
    triggers: ["webhook"],
    webhookPort: 8765,
    enabled: true,
    updatedAt: 1
  } as Automation)
  assert.deepEqual(
    chips.map((chip) => chip.text),
    ["on_save", "8765"]
  )
})

test("新建默认只选手动时，点定时替换而不是叠高亮", () => {
  assert.deepEqual(toggleTrigger(["manual"], "cron"), ["cron"])
  assert.deepEqual(toggleTrigger(["cron"], "manual"), ["manual", "cron"])
  assert.deepEqual(toggleTrigger(["manual", "cron"], "manual"), ["cron"])
})

test("webhook 端口必须是 1–65535", () => {
  assert.equal(webhookPortReady("8765"), true)
  assert.equal(webhookPortReady("0"), false)
  assert.equal(webhookPortReady("abc"), false)
})
