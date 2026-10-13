/**
 * jojo：红卡正文不复述标题；拼回正文用定稿文案。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { zhChat } from "./catalogs/zh/chat.ts"
import { enChat } from "./catalogs/en/chat.ts"

for (const [lang, c] of [["zh", zhChat], ["en", enChat]] as const) {
  test(`${lang}：发送还稿红卡正文不以标题开头`, () => {
    const title = c.sendFailedRestoreTitle.replace(/[。.]$/, "")
    assert.ok(!c.sendFailedRestore.startsWith(title), c.sendFailedRestore)
    assert.ok(!c.sendFailedRestoreMerged.startsWith(title), c.sendFailedRestoreMerged)
  })
}

test("zh 拼回正文定稿", () => {
  assert.equal(zhChat.sendFailedRestoreMerged, "没发出去的这条已接在你新打的内容后面，改好再发。")
})
