/**
 * I1 文案锁：成功只写已切换，不写已交接 / 已切换引擎 / handoff。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { enChat } from "../../../../i18n/catalogs/en/chat.ts"
import { zhChat } from "../../../../i18n/catalogs/zh/chat.ts"

const dir = dirname(fileURLToPath(import.meta.url))
const files = [
  "composer-model-chip.tsx",
  "model-switch-panel.tsx",
  "model-switch-feedback.tsx",
  "use-composer-model-switch.ts",
  join("..", "..", "..", "..", "lib", "model-switch-state.ts")
]

const banned = ["已切换引擎", "已交接", "handoff", "已交接", "ACP ·", "会话已重开", "Switched engine"]

test("I1 源码不含换引擎 / 交接成功句", () => {
  for (const name of files) {
    const src = readFileSync(join(dir, name), "utf8")
    for (const token of banned) {
      assert.ok(!src.includes(token), `${name} still contains ${token}`)
    }
  }
})

test("I1 中文短句贴预览", () => {
  assert.equal(zhChat.modelSwitch.badge, "已切换")
  assert.equal(zhChat.modelSwitch.toast, "已切换到 {model}")
  assert.equal(zhChat.modelSwitch.footnote, "同一助手，不换引擎")
  assert.equal(zhChat.modelSwitch.unsupported, "此引擎不支持中途换模型")
  assert.equal(zhChat.modelSwitch.notLoggedIn, "还没登录这个助手，换不了模型")
  assert.equal(zhChat.modelSwitch.empty, "这个助手还没有可换的模型")
  assert.doesNotMatch(zhChat.modelSwitch.hint, /已切换引擎|已交接|handoff/)
  assert.doesNotMatch(enChat.modelSwitch.toast, /engine|handoff|handed off/i)
  assert.equal(enChat.modelSwitch.badge, "Switched")
})
