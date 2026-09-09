/**
 * C 端 picker / 导轨 / 胶囊禁止常驻 ACP 协议登录文案。
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
  "engine-readiness.ts"
]

test("C 端引擎选择器源码不含 ACP 协议常驻文案", () => {
  for (const name of files) {
    const src = readFileSync(join(dir, name), "utf8")
    assert.ok(!src.includes("acpSubscribe"), name)
    assert.ok(!src.includes("ACP ·"), name)
    assert.ok(!src.includes("localToolLoop"), name)
    assert.ok(!src.includes("订阅登录"), name)
  }
})
