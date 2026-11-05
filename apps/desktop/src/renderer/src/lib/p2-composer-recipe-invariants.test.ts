/**
 * P2 Composer 轻 Recipe soft · 源码不变式（leo Must×5 tip 自核）
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "../../../../../..")

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8")
}

test("Must1 · ComposerPreset 只加 optional promptTemplate + desktopBias:boolean；不复用 DesktopMentionBias", () => {
  const schema = read("packages/ipc-contract/src/composer-preset.ts")
  assert.match(schema, /promptTemplate:\s*z\.string\(\)\.max\(4000\)\.optional\(\)/)
  assert.match(schema, /desktopBias:\s*z\.boolean\(\)\.optional\(\)/)
  assert.match(schema, /\.strict\(\)/)
  assert.doesNotMatch(schema, /import\s*\{[^}]*DesktopMentionBias/)
  assert.doesNotMatch(schema, /desktopBias:\s*DesktopMentionBias/)
  assert.match(schema, /COMPOSER_PRESET_ALLOWED_KEYS/)
  assert.match(schema, /COMPOSER_PRESET_FORBIDDEN_KEYS/)
})

test("Must2 · 红线 fail-closed：禁授权/名单/密钥键；禁 strip-then-save", () => {
  const schema = read("packages/ipc-contract/src/composer-preset.ts")
  assert.match(schema, /alwaysAllow/)
  assert.match(schema, /allowlist/)
  assert.match(schema, /allowedTools/)
  assert.match(schema, /secret/)
  assert.match(schema, /禁 strip-then-save|禁洗白|洗白/)
  const main = read("apps/desktop/src/main/services/composer-presets.ts")
  assert.match(main, /ComposerPreset\.safeParse/)
  assert.match(main, /MAX_PRESETS\s*=\s*12/)
  assert.match(main, /slice\(0,\s*MAX_PRESETS\)/)
  assert.doesNotMatch(main, /stripForbidden|omit\(.*alwaysAllow|wash/)
})

test("Must3 · 套用只改当前 Composer；running||pendingApproval 早退；handoff 带齐新字段", () => {
  const apply = read(
    "apps/desktop/src/renderer/src/components/ai-chat/agent-picker/apply-composer-preset.ts"
  )
  assert.match(apply, /store\.running\s*\|\|\s*store\.pendingApproval/)
  assert.match(apply, /pendingPreset:\s*face/)
  assert.match(apply, /promptTemplate/)
  assert.match(apply, /desktopBias/)

  const face = read("apps/desktop/src/renderer/src/components/ai-chat/agent-picker/preset-face.ts")
  assert.match(face, /setComposer/)
  assert.match(face, /setPresetDesktopBias/)
  assert.doesNotMatch(face, /pendingApproval/)
  assert.doesNotMatch(face, /RunAgentInput/)

  const types = read(
    "apps/desktop/src/renderer/src/components/ai-chat/agent-picker/handoff/plan-composer-switch.types.ts"
  )
  assert.match(types, /promptTemplate\?:/)
  assert.match(types, /desktopBias\?:/)
})

test("Must4 · migrate 软兼容 ≤12；旧无 prompt 零回归路径仍在", () => {
  const main = read("apps/desktop/src/main/services/composer-presets.ts")
  assert.match(main, /MAX_PRESETS\s*=\s*12/)
  assert.match(main, /key\s*=\s*"composer\.presets"|const KEY = "composer\.presets"/)
  const schema = read("packages/ipc-contract/src/composer-preset.ts")
  assert.match(schema, /promptTemplate:.*optional/)
  assert.match(schema, /desktopBias:.*optional/)
})

test("Must5 · 诚实文案；禁全面 Recipe / Goose / 技能自动批准 / 已批准桌面", () => {
  const zh = read("apps/desktop/src/renderer/src/i18n/catalogs/zh/chat.ts")
  assert.match(zh, /presetPrompt:\s*"提示词"/)
  assert.match(zh, /presetPromptPlaceholder:\s*"可选 · 套用时填入 Composer 草稿"/)
  assert.match(zh, /presetDesktopBias:\s*"更倾向桌面操控"/)
  assert.match(zh, /presetDesktopBiasHint:\s*"只影响助手偏好，不会自动批准任何操作"/)
  assert.match(zh, /presetAppliedToast:\s*"已套用「\{name\}」"/)
  assert.match(zh, /presetHasPrompt:\s*"有提示词"/)
  assert.doesNotMatch(zh, /全面 Recipe|Goose 兼容|技能自动批准|已批准桌面/)

  const row = read(
    "apps/desktop/src/renderer/src/components/ai-chat/agent-picker/composer-preset-row.tsx"
  )
  assert.doesNotMatch(row, /Goose|allowed-tools|E8|event-batch|全面 Recipe/)
  assert.match(row, /showAppToast/)
  assert.match(row, /presetAppliedToast/)
})
