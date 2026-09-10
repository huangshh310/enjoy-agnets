/**
 * dense-p0（唯一真源）：列表禁止协议微标、额度 hint、「官方仍保留」和 doctor 句。
 * 「官方仍保留」只允许出现在配置抽屉（agent-tool-account-aside），不上表。
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
  "体检正常",
  "额度进配置",
  "meta.tagline",
  "actions.meta",
  "officialAccountAside",
  "doctorOk",
  "doctorRun",
  "listLine",
  "local-cli-dense-v2"
]

test("本机 CLI 列表源码不含协议微标 / 额度 / 邮箱 / 表底禁令", () => {
  for (const name of files) {
    const src = readFileSync(join(dir, name), "utf8")
    for (const token of banned) {
      assert.ok(!src.includes(token), `${name} still contains ${token}`)
    }
  }
})

test("助手次行只拼版本 · 短路径，不用品牌 meta / listLine / doctor", () => {
  const src = readFileSync(join(dir, "../agent-tool-row-parts.tsx"), "utf8")
  const secondary = readFileSync(join(dir, "../list-secondary.ts"), "utf8")
  assert.ok(src.includes("formatListSecondary"))
  assert.ok(src.includes("listSynced"))
  assert.ok(!src.includes("listTaglineKey"))
  assert.ok(!src.includes("listLine"))
  assert.ok(!secondary.includes("listHint"))
  assert.ok(!secondary.includes("npm 全局"))
  assert.ok(!secondary.includes("体检正常"))
  assert.ok(!secondary.includes("doctorOk"))
  assert.ok(secondary.includes("shortVersion"))
})

test("「官方仍保留」只进抽屉旁注，不上列表文件", () => {
  const aside = readFileSync(join(dir, "../agent-tool-account-aside.tsx"), "utf8")
  assert.ok(aside.includes("officialAccountAside"))
  for (const name of files) {
    const src = readFileSync(join(dir, name), "utf8")
    assert.ok(!src.includes("officialAccountAside"), `${name} leaked official aside onto the list`)
  }
})

test("操作列主槽定宽，复制-only 留空位", () => {
  const layout = readFileSync(join(dir, "../list-layout.ts"), "utf8")
  const parts = readFileSync(join(dir, "../agent-tool-row-parts.tsx"), "utf8")
  const page = readFileSync(join(dir, "../agent-tools-page.tsx"), "utf8")
  const row = readFileSync(join(dir, "../agent-tool-row.tsx"), "utf8")
  assert.ok(layout.includes("8.75rem"))
  assert.ok(layout.includes("6.75rem"))
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
