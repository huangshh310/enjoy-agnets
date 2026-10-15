import assert from "node:assert/strict"
import { test } from "node:test"
import { sendRestoreDetail } from "./send-restore-detail.ts"
import { SEND_FAILED_RESTORE_MERGED } from "./classify-thread-error.ts"
import { SEND_FAILED_RESTORE } from "../../hooks/queue-composer-send-copy.ts"

const t = (key: string) => key

test("jojo P3：还稿时输入框里有图 → 文字和图片已放回", () => {
  assert.equal(sendRestoreDetail(SEND_FAILED_RESTORE, t, 1), "chat.sendFailedRestoreWithImageOne")
  assert.equal(sendRestoreDetail(SEND_FAILED_RESTORE, t, 2), "chat.sendFailedRestoreWithImages")
})

test("没图 / 接在末尾 / 非还稿码：不改文案", () => {
  assert.equal(sendRestoreDetail(SEND_FAILED_RESTORE, t, 0), null)
  assert.equal(sendRestoreDetail(SEND_FAILED_RESTORE_MERGED, t, 2), null)
  assert.equal(sendRestoreDetail("credential_invalid", t, 2), null)
})

test("luna：只有图 → 图片已放回；有字有图 → 文字和图片已放回", () => {
  assert.equal(sendRestoreDetail(SEND_FAILED_RESTORE, t, 1, false), "chat.sendFailedRestoreImageOnlyOne")
  assert.equal(sendRestoreDetail(SEND_FAILED_RESTORE, t, 3, false), "chat.sendFailedRestoreImagesOnly")
  assert.equal(sendRestoreDetail(SEND_FAILED_RESTORE, t, 2, true), "chat.sendFailedRestoreWithImages")
})

test("luna：只有字走默认还稿文案「内容已放回输入框」", async () => {
  const zh = (await import("../../i18n/catalogs/zh/chat.ts")).zhChat as Record<string, string>
  assert.equal(sendRestoreDetail(SEND_FAILED_RESTORE, t, 0, true), null)
  assert.equal(zh.sendFailedRestore, "内容已放回输入框，可以直接再发。")
  assert.equal(zh.sendFailedRestoreImagesOnly, "图片已放回输入框，可以直接再发。")
})

test("luna 锁定文案：英文一张图单数、两张及以上复数；中文同句", async () => {
  const { restoredImagesDetail } = await import("./send-restore-detail.ts")
  const en = (await import("../../i18n/catalogs/en/chat.ts")).enChat as Record<string, string>
  const zh = (await import("../../i18n/catalogs/zh/chat.ts")).zhChat as Record<string, string>
  const tEn = (key: string) => en[key.replace(/^chat\./, "")] ?? key
  const tZh = (key: string) => zh[key.replace(/^chat\./, "")] ?? key
  assert.equal(restoredImagesDetail(tEn as never, 1, false), "Your image is back in the input. You can send it again.")
  assert.equal(restoredImagesDetail(tEn as never, 2, false), "Your images are back in the input. You can send them again.")
  assert.equal(restoredImagesDetail(tEn as never, 1, true), "Your text and image are back in the input. You can send them again.")
  assert.equal(restoredImagesDetail(tEn as never, 2, true), "Your text and images are back in the input. You can send them again.")
  assert.equal(restoredImagesDetail(tZh as never, 1, false), "图片已放回输入框，可以直接再发。")
  assert.equal(restoredImagesDetail(tZh as never, 3, true), "文字和图片已放回输入框，可以直接再发。")
})
