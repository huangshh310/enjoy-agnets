/**
 * 思考铬按 RuntimeCapabilities 分面，禁止 model-id 假五档。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { composerThinkingChrome } from "@enjoy-agents/ipc-contract/runtime-capabilities"
import { zhChat } from "../../../../i18n/catalogs/zh/chat.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("思考铬种类跟能力表走", () => {
  assert.equal(composerThinkingChrome("enjoy-local"), "effort")
  assert.equal(composerThinkingChrome("claude"), "follow-model")
  assert.equal(composerThinkingChrome("cursor"), "follow-model")
  assert.equal(composerThinkingChrome("grok"), "none")
})

test("跟模型面不引入五档条", () => {
  const src = readFileSync(join(dir, "composer-thinking-chrome.tsx"), "utf8")
  assert.match(src, /composer-thinking-follow-model/)
  assert.match(src, /thinkingFollowModel/)
  assert.match(src, /composerThinkingChrome/)
  assert.match(src, /kind === "effort"/)
  assert.match(src, /setAgentPickerOpen/)
  assert.equal(src.includes("getEffortLevels"), false)
})

test("model-id 人话入口不写五档词", () => {
  assert.equal(zhChat.thinkingFollowModel, "思考 · 跟模型")
})
