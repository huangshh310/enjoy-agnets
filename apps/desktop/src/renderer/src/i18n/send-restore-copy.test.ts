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
  })
}

// luna #150 C 端锁定文案：拼回正文按定稿原样（en 定稿本身以标题句开头，不套上面的规则）。
test("拼回正文 / 标题定稿（luna 锁定）", () => {
  assert.equal(zhChat.sendFailedRestoreMerged, "这条没发出去，已接在输入框末尾，改好再发。")
  assert.equal(enChat.sendFailedRestoreMerged, "This one didn't send. It's added to the end of your draft. Edit it, then send.")
  assert.equal(enChat.sendFailedRestoreTitle, "This one didn't send")
  // zh 红卡标题不随这轮改动。
  assert.equal(zhChat.sendFailedRestoreTitle, "这次没发出去")
})
