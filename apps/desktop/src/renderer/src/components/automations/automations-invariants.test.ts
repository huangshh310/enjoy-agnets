/**
 * I4 视觉锁：紧凑行 + 380 抽屉 + 本机脚注；C 端不露协议词。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { zhStudio } from "../../i18n/catalogs/zh/studio.ts"
import { enStudio } from "../../i18n/catalogs/en/studio.ts"

const dir = dirname(fileURLToPath(import.meta.url))

const uiFiles = [
  "automations-page.tsx",
  "components/automation-drawer.tsx",
  "components/automation-row.tsx",
  "components/automation-list.tsx",
  "components/trigger-pills.tsx",
  "components/mode-pills.tsx",
  "components/engine-pills.tsx",
  "components/automation-footer.tsx",
  "components/webhook-fields.tsx"
]

const banned = ["chat.modeAgent", "chat.modePlan", "chat.modeAsk", "ACP", "ToolLoop", "云端执行中"]

test("页脚钉死本机诚实句", () => {
  assert.equal(zhStudio.automations.localOnly, "仅在本机运行，关闭应用则暂停")
  assert.equal(enStudio.automations.localOnly, "仅在本机运行，关闭应用则暂停")
  assert.equal(zhStudio.automations.webhookLocalOnly, "webhook 仅本机端口，非公网")
  assert.equal(enStudio.automations.webhookLocalOnly, "webhook 仅本机端口，非公网")
  const footer = readFileSync(join(dir, "components/automation-footer.tsx"), "utf8")
  assert.ok(footer.includes("studio.automations.localOnly"))
  assert.ok(footer.includes("studio.automations.webhookLocalOnly"))
})

test("编辑走 SettingsSideDrawer 380px，不是居中 Dialog", () => {
  const drawer = readFileSync(join(dir, "components/automation-drawer.tsx"), "utf8")
  assert.ok(drawer.includes("SettingsSideDrawer"))
  assert.ok(drawer.includes("AUTOMATION_DRAWER_WIDTH_CLASS"))
  assert.ok(!drawer.includes("DialogContent"))
  const constants = readFileSync(join(dir, "constants.ts"), "utf8")
  assert.ok(constants.includes("380px"))
})

test("P1 触发可点手动/cron/保存后/webhook，不再划掉", () => {
  const pills = readFileSync(join(dir, "components/trigger-pills.tsx"), "utf8")
  assert.ok(pills.includes('"manual"'))
  assert.ok(pills.includes('"cron"'))
  assert.ok(pills.includes('"on_save"'))
  assert.ok(pills.includes('"webhook"'))
  assert.ok(pills.includes("toggleTrigger"))
  assert.ok(!pills.includes("line-through"))
  const drawer = readFileSync(join(dir, "components/automation-drawer.tsx"), "utf8")
  assert.ok(drawer.includes("WebhookFields"))
  const fields = readFileSync(join(dir, "components/webhook-fields.tsx"), "utf8")
  assert.ok(fields.includes("webhookListenHint"))
  assert.ok(!fields.includes("https://"))
})

test("探索/执行表面不含协议模式标签", () => {
  for (const name of uiFiles) {
    const src = readFileSync(join(dir, name), "utf8")
    for (const token of banned) {
      assert.ok(!src.includes(token), `${name} still contains ${token}`)
    }
  }
})

test("失败条进 Inbox 失败筛，不写待验收闸", () => {
  const row = readFileSync(join(dir, "components/automation-row.tsx"), "utf8")
  assert.ok(row.includes("failedBar"))
  assert.ok(!row.includes("needs_review"))
  const page = readFileSync(join(dir, "automations-page.tsx"), "utf8")
  assert.ok(page.includes("requestInboxFilter"))
  assert.ok(page.includes('"failed"'))
})
