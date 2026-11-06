/**
 * 提示收藏 · 契约不变式：白名单 / 禁键 fail-closed / 正文上限。
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
  PromptLibraryEntry,
  PROMPT_LIBRARY_ALLOWED_KEYS,
  PROMPT_LIBRARY_FORBIDDEN_KEYS,
  PROMPT_LIBRARY_TEXT_MAX,
  normalizePromptLibraryText,
  SavePromptLibraryEntryInput
} from "./prompt-library.ts"

const base = {
  id: "pl_1",
  text: "请先列风险，再给最小改动建议。",
  starred: true,
  updatedAt: 1_700_000_000_000
}

test("合法条目 parse", () => {
  const row = PromptLibraryEntry.parse(base)
  assert.equal(row.text, base.text)
  assert.equal(row.starred, true)
  assert.equal(row.createdAt, undefined)
})

test("可选 createdAt", () => {
  const row = PromptLibraryEntry.parse({ ...base, createdAt: 1_600_000_000_000 })
  assert.equal(row.createdAt, 1_600_000_000_000)
})

test("text 超 4000 拒解析", () => {
  assert.throws(() =>
    PromptLibraryEntry.parse({
      ...base,
      text: "x".repeat(PROMPT_LIBRARY_TEXT_MAX + 1)
    })
  )
})

test("空 text 拒解析", () => {
  assert.equal(PromptLibraryEntry.safeParse({ ...base, text: "" }).success, false)
})

test("禁键 / 未知键 · .strict() fail-closed（禁洗白）", () => {
  for (const key of PROMPT_LIBRARY_FORBIDDEN_KEYS) {
    const bad = { ...base, [key]: true }
    const result = PromptLibraryEntry.safeParse(bad)
    assert.equal(result.success, false, `forbidden key ${key} must fail`)
  }
  assert.equal(PromptLibraryEntry.safeParse({ ...base, alwaysAllow: ["bash"] }).success, false)
  assert.equal(PromptLibraryEntry.safeParse({ ...base, allowlist: ["app"] }).success, false)
  assert.equal(PromptLibraryEntry.safeParse({ ...base, allowedTools: ["desktop_act"] }).success, false)
  assert.equal(PromptLibraryEntry.safeParse({ ...base, secret: "x" }).success, false)
  assert.equal(PromptLibraryEntry.safeParse({ ...base, apiKey: "sk" }).success, false)
  assert.equal(PromptLibraryEntry.safeParse({ ...base, runtimeId: "enjoy-local" }).success, false)
  assert.equal(PromptLibraryEntry.safeParse({ ...base, modelId: "gpt" }).success, false)
  assert.equal(PromptLibraryEntry.safeParse({ ...base, surface: "explore" }).success, false)
  assert.equal(PromptLibraryEntry.safeParse({ ...base, desktopBias: true }).success, false)
})

test("允许键 ⊆ 白名单；独立于 COMPOSER_PRESET_*", () => {
  const keys = Object.keys(PromptLibraryEntry.shape).sort()
  assert.deepEqual(keys, [...PROMPT_LIBRARY_ALLOWED_KEYS].sort())
  for (const key of PROMPT_LIBRARY_FORBIDDEN_KEYS) {
    assert.equal(keys.includes(key), false)
  }
  // 不得出现引擎/预设字段
  assert.equal(keys.includes("runtimeId"), false)
  assert.equal(keys.includes("promptTemplate"), false)
})

test("SavePromptLibraryEntryInput 同样 fail-closed", () => {
  assert.equal(
    SavePromptLibraryEntryInput.safeParse({
      text: "hello",
      starred: false,
      alwaysAllow: true
    }).success,
    false
  )
})

test("normalizePromptLibraryText 空≈缺省", () => {
  assert.equal(normalizePromptLibraryText(""), undefined)
  assert.equal(normalizePromptLibraryText("   "), undefined)
  assert.equal(normalizePromptLibraryText(null), undefined)
  assert.equal(normalizePromptLibraryText("hello"), "hello")
  assert.equal(normalizePromptLibraryText("x".repeat(5000))?.length, PROMPT_LIBRARY_TEXT_MAX)
})
