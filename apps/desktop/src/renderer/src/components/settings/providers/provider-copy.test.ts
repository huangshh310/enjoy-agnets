/**
 * 自定义端点抽屉文案：无多余空格，主地址叫接口地址。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))

test("自定义端点标题走 addCustom，地址走 baseUrl", () => {
  const chrome = readFileSync(join(dir, "provider-editor-drawer-chrome.tsx"), "utf8")
  assert.match(chrome, /settings\.providers\.addCustom/)
  assert.match(chrome, /kind === "custom"/)
  const fields = readFileSync(join(dir, "provider-endpoint-fields.tsx"), "utf8")
  assert.match(fields, /settings\.providers\.baseUrl/)
  assert.match(fields, /settings\.providers\.baseUrlHint/)
  assert.doesNotMatch(fields, /primaryBase/)
})

test("列表改密钥直接 openEdit，关抽屉后还能再开同一档案", () => {
  const row = readFileSync(join(dir, "provider-configured-row.tsx"), "utf8")
  const page = readFileSync(join(dir, "providers-settings.tsx"), "utf8")
  const recheck = readFileSync(join(dir, "../../../hooks/use-recheck-provider.ts"), "utf8")
  assert.match(row, /onFixKey=\{\(\) => \{\s*onEdit\(\)/)
  assert.match(page, /if \(!settings\.editor && !search\.edit\) openedEdit\.current = null/)
  assert.match(recheck, /recheckStillUnreachable/)
  assert.match(recheck, /credential-recheck-still-unreachable/)
})
