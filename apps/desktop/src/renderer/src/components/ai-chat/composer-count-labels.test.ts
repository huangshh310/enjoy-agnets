import assert from "node:assert/strict"
import { test } from "node:test"
import { translate } from "../../i18n/lookup.ts"
import { enChat } from "../../i18n/catalogs/en/chat.ts"
import { zhChat } from "../../i18n/catalogs/zh/chat.ts"
import { attachmentSummaryLabel, queuedExtrasLabel } from "./composer-count-labels.ts"

const tEn = (path: string, vars?: Record<string, string | number>) => translate({ chat: enChat }, path, vars)
const tZh = (path: string, vars?: Record<string, string | number>) => translate({ chat: zhChat }, path, vars)

test("附件托盘摘要：英文 1 走单数，多于 1 走复数，图+文件拼接（luna main-155）", () => {
  assert.equal(attachmentSummaryLabel(tEn, 1, 0), "1 image")
  assert.equal(attachmentSummaryLabel(tEn, 0, 1), "1 file")
  assert.equal(attachmentSummaryLabel(tEn, 1, 1), "1 image · 1 file")
  assert.equal(attachmentSummaryLabel(tEn, 2, 3), "2 images · 3 files")
  assert.equal(attachmentSummaryLabel(tEn, 3, 0), "3 images")
})

test("附件托盘摘要：中文 1 和多都是量词说法，不出现英文", () => {
  assert.equal(attachmentSummaryLabel(tZh, 1, 0), "1 张图片")
  assert.equal(attachmentSummaryLabel(tZh, 0, 1), "1 个文件")
  assert.equal(attachmentSummaryLabel(tZh, 2, 1), "2 张图片 · 1 个文件")
})

test("排队卡片附加物：1 单数，多于 1 复数", () => {
  assert.equal(queuedExtrasLabel(tEn, 1), "1 attachment or context chip")
  assert.equal(queuedExtrasLabel(tEn, 2), "2 attachments or context chips")
  assert.equal(queuedExtrasLabel(tZh, 1), "1 个附件或引用")
  assert.equal(queuedExtrasLabel(tZh, 3), "3 个附件或引用")
})
