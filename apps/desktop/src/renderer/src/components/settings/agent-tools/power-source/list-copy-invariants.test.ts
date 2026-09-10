/**
 * 列表表行禁止协议微标、路径、额度条和邮箱。
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
  "power-source-capsule.tsx",
  "format-power-source.ts"
]

const banned = [
  "ToolLoop",
  "ACP Stdio",
  "ACP ·",
  "detectedPath",
  "quotaInfo",
  "authAccount?.email",
  "HonestQuotaEmpty",
  "localToolLoop",
  "订阅登录"
]

test("本机 CLI 列表源码不含协议微标 / 路径 / 额度 / 邮箱", () => {
  for (const name of files) {
    const src = readFileSync(join(dir, name), "utf8")
    for (const token of banned) {
      assert.ok(!src.includes(token), `${name} still contains ${token}`)
    }
  }
})
