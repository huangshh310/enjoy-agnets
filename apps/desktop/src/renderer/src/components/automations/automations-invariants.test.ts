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
  "components/automation-footer.tsx"
]

const banned = ["chat.modeAgent", "chat.modePlan", "chat.modeAsk", "ACP", "ToolLoop", "云端执行中"]

test("页脚钉死本机诚实句", () => {
  assert.equal(zhStudio.automations.localOnly, "仅在本机运行，关闭应用则暂停")
  assert.equal(enStudio.automations.localOnly, "仅在本机运行，关闭应用则暂停")
  const footer = readFileSync(join(dir, "components/automation-footer.tsx"), "utf8")
  assert.ok(footer.includes("studio.automations.localOnly"))
})

test("编辑走 SettingsSideDrawer 380px，不是居中 Dialog", () => {
  const drawer = readFileSync(join(dir, "components/automation-drawer.tsx"), "utf8")
  assert.ok(drawer.includes("SettingsSideDrawer"))
  assert.ok(drawer.includes("AUTOMATION_DRAWER_WIDTH_CLASS"))
  assert.ok(!drawer.includes("DialogContent"))
  const constants = readFileSync(join(dir, "constants.ts"), "utf8")
  assert.ok(constants.includes("380px"))
})

test("P0 触发只点手动/cron，保存后与 webhook 划掉", () => {
  const pills = readFileSync(join(dir, "components/trigger-pills.tsx"), "utf8")
  assert.ok(pills.includes('onChange("manual")'))
  assert.ok(pills.includes('onChange("cron")'))
  assert.ok(pills.includes("line-through"))
  assert.ok(!pills.includes('onChange("on_save")'))
  assert.ok(!pills.includes('onChange("webhook")'))
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
