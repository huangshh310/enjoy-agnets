/**
 * Universal Blobatar 头像系统单元测试：
 * 验证默认配置契约、颜色预设色相区间与表情名合法性。
 */

import test from "node:test"
import assert from "node:assert/strict"
import {
  BLOBATAR_COLOR_PRESETS,
  BLOBATAR_EXPRESSIONS,
  DEFAULT_BLOBATAR_CONFIG,
  RANDOM_AVATAR_SEEDS
} from "./blobatar.types.ts"

test("DEFAULT_BLOBATAR_CONFIG: 具有合法的初始默认值", () => {
  assert.equal(typeof DEFAULT_BLOBATAR_CONFIG.name, "string")
  assert.equal(DEFAULT_BLOBATAR_CONFIG.expression, "idle")
  assert.ok(DEFAULT_BLOBATAR_CONFIG.hue! >= 0 && DEFAULT_BLOBATAR_CONFIG.hue! <= 360)
  assert.ok(DEFAULT_BLOBATAR_CONFIG.tone! >= 0 && DEFAULT_BLOBATAR_CONFIG.tone! <= 1)
  assert.equal(DEFAULT_BLOBATAR_CONFIG.background, "squircle")
  assert.equal(DEFAULT_BLOBATAR_CONFIG.animate, "always")
})

test("BLOBATAR_COLOR_PRESETS: 所有颜色预设的色相和明度都在标准域内", () => {
  assert.ok(BLOBATAR_COLOR_PRESETS.length >= 6)
  for (const preset of BLOBATAR_COLOR_PRESETS) {
    assert.ok(preset.hue >= 0 && preset.hue <= 360, `${preset.id} hue out of bounds`)
    assert.ok(preset.tone >= 0 && preset.tone <= 1, `${preset.id} tone out of bounds`)
    assert.match(preset.previewHex, /^#[0-9a-f]{6}$/i)
  }
})

test("BLOBATAR_EXPRESSIONS: 涵盖常用的 9 大微表情", () => {
  const ids = BLOBATAR_EXPRESSIONS.map((e) => e.id)
  assert.ok(ids.includes("idle"))
  assert.ok(ids.includes("happy"))
  assert.ok(ids.includes("wink"))
  assert.ok(ids.includes("smug"))
  assert.ok(ids.includes("thinking"))
  assert.ok(ids.includes("love"))
  assert.ok(ids.includes("surprised"))
  assert.ok(ids.includes("shy"))
  assert.ok(ids.includes("sleepy"))
})

test("RANDOM_AVATAR_SEEDS: 包含充足的创意灵感种子且不为空串", () => {
  assert.ok(RANDOM_AVATAR_SEEDS.length >= 10)
  for (const seed of RANDOM_AVATAR_SEEDS) {
    assert.ok(seed.trim().length > 0)
  }
})
