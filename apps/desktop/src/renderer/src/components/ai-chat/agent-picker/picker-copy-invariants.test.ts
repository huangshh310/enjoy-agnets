/**
 * C 端 picker / 导轨 / 胶囊禁止常驻协议与路径微标。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const files = [
  "agent-picker.tsx",
  "agent-engine-rail.tsx",
  "engine-rail-tab.tsx",
  "agent-cli-pane.tsx",
  "composer-chip-label.ts",
  "engine-readiness.ts",
  "split-composer-rail.ts"
]

const banned = [
  "acpSubscribe",
  "localToolLoop",
  "sandboxHarness",
  "chat.usage.source",
  "ACP ·",
  "ACP Stdio",
  "订阅登录",
  "本地 ToolLoop"
]

test("C 端引擎选择器源码不含协议/路径常驻微标", () => {
  for (const name of files) {
    const src = readFileSync(join(dir, name), "utf8")
    for (const token of banned) {
      assert.ok(!src.includes(token), `${name} still contains ${token}`)
    }
  }
})
