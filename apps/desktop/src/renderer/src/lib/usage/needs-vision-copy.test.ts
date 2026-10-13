import assert from "node:assert/strict"
import { test } from "node:test"
import { classifyThreadError, humanizeThreadError, MODEL_NEEDS_VISION } from "./classify-thread-error.ts"
import { zhChat as zh } from "../../i18n/catalogs/zh/chat.ts"
import { enChat as en } from "../../i18n/catalogs/en/chat.ts"

const tr = (cat: Record<string, unknown>) => (key: string) => String(cat[key.replace(/^chat\./, "")] ?? key)

test("luna P1：视觉错误按码出锁定文案（红卡标题 / 正文、收件箱详情），不摊英文原文", () => {
  assert.equal(classifyThreadError(MODEL_NEEDS_VISION), "needs_vision")
  const z = zh as unknown as Record<string, string>
  const e = en as unknown as Record<string, string>
  assert.equal(z.needsVisionTitle, "这个模型看不了图片")
  assert.equal(z.needsVisionHint, "换一个能看图的模型再试。")
  assert.equal(e.needsVisionTitle, "This model can't read images")
  assert.equal(e.needsVisionHint, "Switch to a model that can, then try again.")
  assert.equal(humanizeThreadError(MODEL_NEEDS_VISION, tr(z)), "这个模型看不了图片。换一个能看图的模型再试。")
  assert.equal(humanizeThreadError(MODEL_NEEDS_VISION, tr(e)), "This model can't read images. Switch to a model that can, then try again.")
})
