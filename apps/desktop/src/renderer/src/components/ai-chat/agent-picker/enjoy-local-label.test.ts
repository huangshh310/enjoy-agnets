import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("Enjoy 本地胶囊名一律走 i18n，不用 harness 预设的中文 label（英文不露「Enjoy 本地」，luna #151）", () => {
  const picker = readFileSync(new URL("./use-agent-picker.ts", import.meta.url), "utf8")
  const sw = readFileSync(new URL("../composer/model-switch/use-composer-model-switch.ts", import.meta.url), "utf8")
  assert.match(picker, /currentAgentName = runtimeId === DEFAULT_RUNTIME_ID \? t\("chat\.usage\.enjoyLocal"\)/)
  assert.match(sw, /engineLabel = runtimeId === DEFAULT_RUNTIME_ID \? t\("chat\.usage\.enjoyLocal"\)/)
  const en = readFileSync(new URL("../../../i18n/catalogs/en/chat.ts", import.meta.url), "utf8")
  assert.match(en, /enjoyLocal: "Enjoy Local"/)
})
