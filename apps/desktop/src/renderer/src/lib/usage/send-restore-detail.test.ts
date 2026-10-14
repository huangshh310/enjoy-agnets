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
