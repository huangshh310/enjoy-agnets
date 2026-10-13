import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const drawer = readFileSync(new URL("./automation-drawer.tsx", import.meta.url), "utf8")
const page = readFileSync(new URL("../automations-page.tsx", import.meta.url), "utf8")

test("说明空：保存禁用并说原因；立即运行同样禁用（不再跑旧说明，luna #151）", () => {
  assert.match(drawer, /saveReason = automationSaveReason\(draft, t\)/)
  assert.match(drawer, /runDisabled = !draft\.id \|\| running \|\| !draft\.name\.trim\(\) \|\| !draft\.prompt\.trim\(\)/)
  assert.match(drawer, /data-testid="automation-run-now"[\s\S]*?disabled=\{runDisabled\}/)
  assert.match(drawer, /data-testid="automation-save-reason"/)
})

test("禁用要看得出（浅色也是）：保存 / 立即运行带 disabled:opacity-50", () => {
  const n = drawer.match(/className="disabled:opacity-50"/g)?.length ?? 0
  assert.ok(n >= 2, String(n))
})

test("保存被主进程拒：出 toast，不静默", () => {
  const fn = page.slice(page.indexOf("async function persist"), page.indexOf("async function toggleEnabled"))
  assert.match(fn, /catch \(error\)/)
  assert.match(fn, /studio\.automations\.promptRequired/)
})

test("文案：中英都有「填写提示词后才能保存」", async () => {
  const zh = readFileSync(new URL("../../../i18n/catalogs/zh/studio.ts", import.meta.url), "utf8")
  const en = readFileSync(new URL("../../../i18n/catalogs/en/studio.ts", import.meta.url), "utf8")
  assert.match(zh, /promptRequired: "填写提示词后才能保存"/)
  assert.match(en, /promptRequired: "Fill in the prompt to save"/)
})
