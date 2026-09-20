/**
 * C 端探索/执行表面禁止协议词与 ask|plan|agent 原文。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { zhChat } from "../../../../i18n/catalogs/zh/chat.ts"
import { enChat } from "../../../../i18n/catalogs/en/chat.ts"
import { zhSettings } from "../../../../i18n/catalogs/zh/settings.ts"
import { enSettings } from "../../../../i18n/catalogs/en/settings.ts"

const dir = dirname(fileURLToPath(import.meta.url))
const files = [
  "explore-execute-toggle.tsx",
  "explore-capability-rail.tsx",
  "explore-intercept-banner.tsx",
  join("..", "..", "..", "settings", "settings-default-mode.tsx"),
  join("..", "..", "..", "settings", "settings-defaults.tsx"),
  join("..", "composer-host-mode-chip.tsx"),
  join("..", "..", "thread", "sources", "source-chips.tsx"),
  join("..", "..", "thread", "sources", "source-detail-sheet.tsx"),
  join("..", "..", "thread", "sources", "source-detail-row.tsx")
]

const banned = [
  "ACP",
  "ToolLoop",
  "chat.modeAgent",
  "chat.modePlan",
  "chat.modeAsk",
  "ExecutionModeMenu"
]

test("探索/执行表面源码不含协议模式标签", () => {
  for (const name of files) {
    const src = readFileSync(join(dir, name), "utf8")
    for (const token of banned) {
      assert.ok(!src.includes(token), `${name} still contains ${token}`)
    }
  }
})

test("C 端默认项与分段词表只写探索/执行", () => {
  assert.equal(zhChat.surfaceExplore, "探索")
  assert.equal(zhChat.surfaceExecute, "执行")
  assert.equal(zhChat.surfaceExploreDisabled, "此助手暂不支持探索/执行切换")
  assert.equal(enChat.surfaceExplore, "Explore")
  assert.equal(enChat.surfaceExecute, "Execute")
  assert.equal(enChat.surfaceExploreDisabled, "This assistant cannot switch Explore / Execute")
  assert.doesNotMatch(zhSettings.defaults.modeDesc, /ask|plan|agent|ACP|Ask|Plan|Agent/i)
  assert.doesNotMatch(enSettings.defaults.modeDesc, /ask|plan|agent|ACP/i)
  assert.doesNotMatch(zhChat.surfaceExploreFootnote, /ask|plan|agent|ACP/i)
  assert.doesNotMatch(zhChat.hostModeHint, /ask|plan|agent|ACP|智能体/i)
  assert.doesNotMatch(enChat.hostModeHint, /\bask\b|\bplan\b|\bagent\b|ACP/i)
})
