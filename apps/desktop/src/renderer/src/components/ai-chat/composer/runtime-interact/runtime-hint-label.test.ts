/**
 * luna 定稿：运行中收不了图（ACP / 模型看不了图同一句）改排队的提示。
 * zh 一句；en 按图数分单复数。收得下图时仍是「已收到」。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { zh } from "../../../../i18n/catalogs/zh/index.ts"
import { en } from "../../../../i18n/catalogs/en/index.ts"
import { translate } from "../../../../i18n/lookup.ts"

const { hintLabel, imageSteerQueuedHintKey } = await import("./runtime-hint-label.ts")

const tZh = (path: string, vars?: Record<string, string | number>) => translate(zh, path, vars)
const tEn = (path: string, vars?: Record<string, string | number>) => translate(en, path, vars)

const ZH = "它运行中收不了图，这条连图一起排到下一轮发。"
const EN_ONE = "It can't take images while running, so this message and its image will be sent next turn."
const EN_MANY = "It can't take images while running, so this message and its images will be sent next turn."

test("zh：收不了图改排队——1 张、多张都是同一句定稿", () => {
  assert.equal(hintLabel("imageSteerQueued", tZh, "", 1), ZH)
  assert.equal(hintLabel("imageSteerQueued", tZh, "", 2), ZH)
  assert.equal(hintLabel("imageSteerQueued", tZh, "", 5), ZH)
})

test("en 单数：1 张图用 its image", () => {
  assert.equal(hintLabel("imageSteerQueued", tEn, "", 1), EN_ONE)
})

test("en 复数：2 张及以上用 its images", () => {
  assert.equal(hintLabel("imageSteerQueued", tEn, "", 2), EN_MANY)
  assert.equal(hintLabel("imageSteerQueued", tEn, "", 3), EN_MANY)
})

test("选键：1 → One，其余 → 复数键（键都在两边词表里）", () => {
  assert.equal(imageSteerQueuedHintKey(1), "chat.runtimeImageSteerQueuedHintOne")
  assert.equal(imageSteerQueuedHintKey(2), "chat.runtimeImageSteerQueuedHint")
  for (const key of [imageSteerQueuedHintKey(1), imageSteerQueuedHintKey(2)]) {
    assert.notEqual(tZh(key), key, `zh 缺键 ${key}`)
    assert.notEqual(tEn(key), key, `en 缺键 ${key}`)
  }
})

test("收得下图（插话成功）仍提示「已收到」，不被改排队文案替换", () => {
  assert.ok(hintLabel("steered", tZh, "", 1).startsWith("已收到"))
  assert.notEqual(hintLabel("steered", tEn, "", 1), EN_ONE)
})

test("文案不含工程词（检查点 / HEAD / commit / 快照 / checkpoint / ref）", () => {
  const banned = /检查点|HEAD|commit|快照|checkpoint|\bref\b/i
  for (const s of [ZH, EN_ONE, EN_MANY, zh.chat.runtimeImageSteerQueuedHint, zh.chat.runtimeImageSteerQueuedHintOne, en.chat.runtimeImageSteerQueuedHint, en.chat.runtimeImageSteerQueuedHintOne]) {
    assert.doesNotMatch(s, banned, s)
  }
})
