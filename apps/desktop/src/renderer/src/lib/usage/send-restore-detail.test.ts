import assert from "node:assert/strict"
import { test } from "node:test"
import { sendRestoreDetail } from "./send-restore-detail.ts"
import { SEND_FAILED_RESTORE_MERGED } from "./classify-thread-error.ts"
import { SEND_FAILED_RESTORE } from "../../hooks/queue-composer-send-copy.ts"

const t = (key: string) => key

test("jojo P3：还稿时输入框里有图 → 文字和图片已放回", () => {
  assert.equal(sendRestoreDetail(SEND_FAILED_RESTORE, t, 1), "chat.sendFailedRestoreWithImages")
})

test("没图 / 接在末尾 / 非还稿码：不改文案", () => {
  assert.equal(sendRestoreDetail(SEND_FAILED_RESTORE, t, 0), null)
  assert.equal(sendRestoreDetail(SEND_FAILED_RESTORE_MERGED, t, 2), null)
  assert.equal(sendRestoreDetail("credential_invalid", t, 2), null)
})

test("luna：只有图 → 图片已放回；有字有图 → 文字和图片已放回", () => {
  assert.equal(sendRestoreDetail(SEND_FAILED_RESTORE, t, 1, false), "chat.sendFailedRestoreImagesOnly")
  assert.equal(sendRestoreDetail(SEND_FAILED_RESTORE, t, 2, true), "chat.sendFailedRestoreWithImages")
})

test("luna：只有字走默认还稿文案「内容已放回输入框」", async () => {
  const zh = (await import("../../i18n/catalogs/zh/chat.ts")).zhChat as Record<string, string>
  assert.equal(sendRestoreDetail(SEND_FAILED_RESTORE, t, 0, true), null)
  assert.equal(zh.sendFailedRestore, "内容已放回输入框，可以直接再发。")
  assert.equal(zh.sendFailedRestoreImagesOnly, "图片已放回输入框，可以直接再发。")
})
