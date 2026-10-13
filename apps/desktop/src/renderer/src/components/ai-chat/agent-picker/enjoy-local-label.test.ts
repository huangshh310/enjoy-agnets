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

test("其余入口：引擎脸 / 会话脸 / 能力矩阵 / 资料卡都不硬写「Enjoy 本地」", () => {
  const face = readFileSync(new URL("../../../hooks/use-engine-display-name.ts", import.meta.url), "utf8")
  assert.match(face, /if \(runtimeId === "enjoy-local"\) brandLabel = t\("chat\.usage\.enjoyLocal"\)/)
  const matrix = readFileSync(new URL("../../settings/agent-tools/capability-matrix.tsx", import.meta.url), "utf8")
  assert.match(matrix, /id === "enjoy-local"\s*\? t\("chat\.usage\.enjoyLocal"\)/)
  const bento = readFileSync(new URL("../../account/cards/profile-ecosystem-bento.tsx", import.meta.url), "utf8")
  assert.doesNotMatch(bento, />Enjoy 本地</)
})

test("助手泡底脚：enjoy-local 引擎名走 i18n，不用主进程中文工具名（luna P3）", async () => {
  const { readFileSync } = await import("node:fs")
  const src = readFileSync(new URL("../thread/turns/turn-model-label.tsx", import.meta.url), "utf8")
  assert.match(src, /message\.runtimeId === "enjoy-local"\s*\?\s*t\("chat\.usage\.enjoyLocal"\)/)
})
