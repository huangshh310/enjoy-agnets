import assert from "node:assert/strict"
import { test } from "node:test"
import { enChat } from "../../i18n/catalogs/en/chat.ts"
import { zhChat } from "../../i18n/catalogs/zh/chat.ts"
import {
  SESSION_TAB_BUSY_LABEL,
  SESSION_TAB_DRAFT_CONFIRM_MESSAGE,
  SESSION_TAB_EMPTY_MESSAGE,
  SESSION_TAB_OVERFLOW_MESSAGE,
  SESSION_TAB_WAIT_LABEL
} from "./session-tabs-logic.ts"

const EN_JARGON = /editor group|\bpane\b|\bsplit\b|waiting_review|\brunning\b/i

test("短锁文案钉死 + 英文无 pane/split/editor group", () => {
  assert.equal(SESSION_TAB_OVERFLOW_MESSAGE, "最多开 6 个标签，先关掉一个再开。")
  assert.equal(SESSION_TAB_EMPTY_MESSAGE, "开一个新对话，或从左边选一个。")
  assert.equal(SESSION_TAB_DRAFT_CONFIRM_MESSAGE, "这段还没发送。留下还是丢掉？")
  assert.equal(SESSION_TAB_BUSY_LABEL, "进行中")
  assert.equal(SESSION_TAB_WAIT_LABEL, "等你拍板")
  assert.equal(zhChat.sessionTabs.overflow, SESSION_TAB_OVERFLOW_MESSAGE)
  assert.equal(zhChat.sessionTabs.empty, SESSION_TAB_EMPTY_MESSAGE)
  assert.equal(zhChat.sessionTabs.draftConfirm, SESSION_TAB_DRAFT_CONFIRM_MESSAGE)
  assert.equal(zhChat.sessionTabs.busy, "进行中")
  assert.equal(zhChat.sessionTabs.waiting, "等你拍板")
  for (const [key, value] of Object.entries(enChat.sessionTabs)) {
    assert.doesNotMatch(value, EN_JARGON, `en chat.sessionTabs.${key}`)
  }
})
