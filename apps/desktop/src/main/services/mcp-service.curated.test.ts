/**
 * 精选身份必须走 marker + 指纹，禁止按显示名 github/filesystem 冒充。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(dir, "mcp-service.ts"), "utf8")
const tools = readFileSync(join(dir, "mcp-agent-tools.ts"), "utf8")
const imported = readFileSync(join(dir, "skill-sources/apply-imported-mcp.ts"), "utf8")

test("hint 只问 isCuratedMcpIdentity，不按 row.name 冒充精选", () => {
  assert.ok(src.includes("isCuratedMcpIdentity"))
  assert.ok(src.includes("resolveCuratedPresetId"))
  assert.equal(src.includes("isCuratedMcpServerName"), false)
  assert.equal(tools.includes("isCuratedMcpServerName"), false)
  assert.ok(tools.includes("item.curated"))
})

test("导入不写 curatedPresetId，且 forced trusted false", () => {
  assert.ok(imported.includes("trusted: false"))
  assert.equal(imported.includes("curatedPresetId"), false)
})
