/**
 * Composer 轻 Recipe · 契约不变式：白名单 / 禁键 fail-closed / 旧预设零回归。
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
  ComposerPreset,
  COMPOSER_PRESET_ALLOWED_KEYS,
  COMPOSER_PRESET_FORBIDDEN_KEYS,
  normalizePromptTemplate,
  SaveComposerPresetInput
} from "./composer-preset.ts"

const base = {
  id: "preset_1",
  name: "代码审阅",
  note: "看 PR",
  runtimeId: "enjoy-local",
  modelId: "gpt-5",
  surface: "explore" as const
}

test("旧预设无 prompt/bias 仍 parse（零回归）", () => {
  const row = ComposerPreset.parse(base)
  assert.equal(row.name, "代码审阅")
  assert.equal(row.promptTemplate, undefined)
  assert.equal(row.desktopBias, undefined)
})

test("可选 promptTemplate ≤4000 + desktopBias boolean", () => {
  const row = ComposerPreset.parse({
    ...base,
    promptTemplate: "请先列风险",
    desktopBias: true
  })
  assert.equal(row.promptTemplate, "请先列风险")
  assert.equal(row.desktopBias, true)
})

test("promptTemplate 超 4000 拒解析", () => {
  assert.throws(() =>
    ComposerPreset.parse({
      ...base,
      promptTemplate: "x".repeat(4001)
    })
  )
})

test("desktopBias 不得写成 DesktopMentionBias 联合体", () => {
  assert.throws(() =>
    ComposerPreset.parse({
      ...base,
      desktopBias: { kind: "host" }
    })
  )
  assert.throws(() =>
    ComposerPreset.parse({
      ...base,
      desktopBias: { kind: "app", displayName: "计算器", appKey: "com.calc", stable: true }
    })
  )
})

test("禁键 / 未知键 · .strict() fail-closed（禁洗白）", () => {
  for (const key of COMPOSER_PRESET_FORBIDDEN_KEYS) {
    const bad = { ...base, [key]: true }
    const result = ComposerPreset.safeParse(bad)
    assert.equal(result.success, false, `forbidden key ${key} must fail`)
  }
  assert.equal(ComposerPreset.safeParse({ ...base, alwaysAllow: ["bash"] }).success, false)
  assert.equal(ComposerPreset.safeParse({ ...base, allowlist: ["app"] }).success, false)
  assert.equal(ComposerPreset.safeParse({ ...base, allowedTools: ["desktop_act"] }).success, false)
  assert.equal(ComposerPreset.safeParse({ ...base, secret: "x" }).success, false)
  assert.equal(ComposerPreset.safeParse({ ...base, apiKey: "sk" }).success, false)
})

test("允许键 ⊆ 白名单", () => {
  const keys = Object.keys(ComposerPreset.shape).sort()
  assert.deepEqual(keys, [...COMPOSER_PRESET_ALLOWED_KEYS].sort())
  for (const key of COMPOSER_PRESET_FORBIDDEN_KEYS) {
    assert.equal(keys.includes(key), false)
  }
})

test("SaveComposerPresetInput 同样 fail-closed", () => {
  assert.equal(
    SaveComposerPresetInput.safeParse({
      name: "x",
      runtimeId: "enjoy-local",
      surface: "execute",
      alwaysAllow: true
    }).success,
    false
  )
})

test("normalizePromptTemplate 空≈缺省", () => {
  assert.equal(normalizePromptTemplate(""), undefined)
  assert.equal(normalizePromptTemplate("   "), undefined)
  assert.equal(normalizePromptTemplate(null), undefined)
  assert.equal(normalizePromptTemplate("hello"), "hello")
})
