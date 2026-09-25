/**
 * CU-P1-R 中文文案钉死预览稿；英文必须同构键。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { enChat } from "../../../../i18n/catalogs/en/chat.ts"
import { zhChat } from "../../../../i18n/catalogs/zh/chat.ts"

test("二次确认卡中文贴预览稿，英文有同构键", () => {
  assert.equal(zhChat.desktopSecondConfirmTitle, "观察已失效 · 请确认是否仍是同一目标")
  assert.match(zhChat.desktopSecondConfirmBody, /对照下方两图/)
  assert.equal(zhChat.desktopSecondConfirmMissingTitle, "无法对照新旧观察")
  assert.equal(zhChat.desktopSecondConfirmPrevious, "批准时 · 批前观察")
  assert.equal(zhChat.desktopSecondConfirmNext, "重拍后 · 新观察")
  assert.equal(zhChat.desktopSecondConfirmAllow, "确认对新观察点击")
  assert.equal(zhChat.desktopSecondConfirmCancel, "取消")
  assert.equal(zhChat.desktopSecondConfirmThumbMissing, "缩略图不可用")
  assert.match(zhChat.desktopSecondConfirmBlind, /看不清就不能点/)
  assert.match(zhChat.desktopSecondConfirmMissingBody, /缩略图/)
  const keys = [
    "desktopSecondConfirmTitle",
    "desktopSecondConfirmBody",
    "desktopSecondConfirmMissingTitle",
    "desktopSecondConfirmPrevious",
    "desktopSecondConfirmNext",
    "desktopSecondConfirmAllow",
    "desktopSecondConfirmCancel"
  ] as const
  for (const key of keys) {
    assert.equal(typeof enChat[key], "string")
    assert.ok(enChat[key].length > 0)
  }
})
