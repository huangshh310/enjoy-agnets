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
  "components/webhook-fields.tsx",
  "components/catch-up-toggle.tsx",
  "components/missed-records-list.tsx",
  "components/last-run-explain.tsx",
  "lib/missed-copy.ts",
  "lib/last-run-line.ts"
]

const banned = ["chat.modeAgent", "chat.modePlan", "chat.modeAsk", "ACP", "ToolLoop", "云端执行中"]

test("页脚钉死本机诚实句", () => {
  assert.equal(zhStudio.automations.localOnly, "仅在本机运行，关闭应用则暂停")
  assert.equal(enStudio.automations.localOnly, "Runs on this machine only. Closing the app pauses it.")
  assert.equal(zhStudio.automations.webhookLocalOnly, "本机推送只听本机端口，不上公网")
  assert.equal(enStudio.automations.webhookLocalOnly, "Local push listens on this machine only")
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

test("automations.changed 含 missed 也会 refetch 列表与错过记录", () => {
  const page = readFileSync(join(dir, "automations-page.tsx"), "utf8")
  assert.ok(page.includes("onChanged"))
  assert.ok(page.includes('invalidateQueries({ queryKey: ["automations"] })'))
  assert.equal(page.includes('reason !== "missed"'), false)
  assert.ok(page.includes("useAutomationMissed"))
  const hook = readFileSync(join(dir, "hooks/use-automation-missed.ts"), "utf8")
  assert.ok(hook.includes('["automations", "missed"]'))
  assert.ok(hook.includes("listMissed"))
})

test("超时次行不走失败红，名称旁不挂已跳过小标", () => {
  const row = readFileSync(join(dir, "components/automation-row.tsx"), "utf8")
  assert.match(row, /lastRunLine/)
  assert.match(row, /line\.testId/)
  assert.doesNotMatch(row, /statusSkipped/)
  const status = readFileSync(join(dir, "lib/row-status.ts"), "utf8")
  assert.match(status, /isNeutralErrorCode/)
  assert.doesNotMatch(status, /lastError/)
})

test("设置能力句钉死默认不补跑", () => {
  assert.equal(zhStudio.automations.catchUpToggle, "错过后补跑最近一次")
  assert.match(enStudio.automations.catchUpToggleDefault, /Once on,/)
  const settings = readFileSync(join(dir, "../../i18n/catalogs/zh/settings.ts"), "utf8")
  assert.match(settings, /默认不补跑，可在单条自动化里开启补跑最近一次/)
  assert.doesNotMatch(settings, /关掉应用不会补跑/)
})

test("折叠条是组摘要，展开/收起跟开合，补跑未跑不写实际或取消时间", () => {
  const list = readFileSync(join(dir, "components/missed-records-list.tsx"), "utf8")
  assert.match(list, /missedGroupSummary/)
  assert.match(list, /missedExpandLabel/)
  assert.match(list, /catchUpWhenCopy/)
  assert.doesNotMatch(list, /hasCancelTime/)
  assert.doesNotMatch(list, /catchUpWhenCancelled/)
  assert.doesNotMatch(list, /studio\.automations\.missedExpand"/)
  const drawer = readFileSync(join(dir, "components/automation-drawer.tsx"), "utf8")
  assert.match(drawer, /triggers\.includes\("cron"\)/)
  const row = readFileSync(join(dir, "components/automation-row.tsx"), "utf8")
  assert.match(row, /LastRunExplain/)
  const explain = readFileSync(join(dir, "components/last-run-explain.tsx"), "utf8")
  assert.match(explain, /aria-describedby/)
  assert.match(explain, /PopoverTrigger/)
})
