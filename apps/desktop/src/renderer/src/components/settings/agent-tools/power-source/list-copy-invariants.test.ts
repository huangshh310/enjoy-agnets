/**
 * 密布局 v2：列表禁止协议微标、额度 hint、绝对路径和「官方仍保留」。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const files = [
  "../agent-tool-row.tsx",
  "../agent-tool-row-parts.tsx",
  "../agent-tools-page.tsx",
  "../list-layout.ts",
  "../list-secondary.ts",
  "power-source-capsule.tsx",
  "format-power-source.ts"
]

const banned = [
  "ToolLoop",
  "ACP Stdio",
  "ACP ·",
  "quotaInfo",
  "authAccount?.email",
  "HonestQuotaEmpty",
  "localToolLoop",
  "订阅登录",
  "quotaInConfigHint",
  "listBanHint",
  "官方仍保留",
  "额度进配置",
  "meta.tagline",
  "actions.meta"
]

test("本机 CLI 列表源码不含协议微标 / 额度 / 邮箱 / 表底禁令", () => {
  for (const name of files) {
    const src = readFileSync(join(dir, name), "utf8")
    for (const token of banned) {
      assert.ok(!src.includes(token), `${name} still contains ${token}`)
    }
  }
})

test("表行副标题走短路径次行，不用品牌 meta 或 listLine", () => {
  const src = readFileSync(join(dir, "../agent-tool-row-parts.tsx"), "utf8")
  assert.ok(src.includes("formatListSecondary"))
  assert.ok(src.includes("listSynced"))
  assert.ok(!src.includes("listTaglineKey"))
  assert.ok(!src.includes("listLine."))
})

test("操作列主槽定宽，复制-only 留空位", () => {
  const layout = readFileSync(join(dir, "../list-layout.ts"), "utf8")
  const parts = readFileSync(join(dir, "../agent-tool-row-parts.tsx"), "utf8")
  const page = readFileSync(join(dir, "../agent-tools-page.tsx"), "utf8")
  const row = readFileSync(join(dir, "../agent-tool-row.tsx"), "utf8")
  assert.ok(layout.includes("9.5rem"))
  assert.ok(layout.includes("7.25rem"))
  assert.ok(parts.includes("CLI_LIST_PRIMARY_SLOT"))
  assert.ok(page.includes("CLI_LIST_GRID"))
  assert.ok(row.includes("CLI_LIST_GRID"))
  assert.ok(!page.includes("listBanHint"))
})

test("动力源格去掉额度 hint，未装画破折号", () => {
  const src = readFileSync(join(dir, "power-source-capsule.tsx"), "utf8")
  assert.ok(src.includes("empty"))
  assert.ok(src.includes("isBlankPowerSource"))
  assert.ok(!src.includes("quotaHint"))
})
