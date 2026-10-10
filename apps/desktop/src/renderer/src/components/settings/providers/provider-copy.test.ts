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
  const drawer = readFileSync(join(dir, "provider-editor-drawer.tsx"), "utf8")
  assert.match(drawer, /settings\.providers\.addCustom/)
  assert.match(drawer, /kind === "custom"/)
  const fields = readFileSync(join(dir, "provider-endpoint-fields.tsx"), "utf8")
  assert.match(fields, /settings\.providers\.baseUrl/)
  assert.match(fields, /settings\.providers\.baseUrlHint/)
  assert.doesNotMatch(fields, /primaryBase/)
})
