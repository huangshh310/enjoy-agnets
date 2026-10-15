/**
 * jojo P3：看门狗失败后只删这次 Enter 新建的真空会话。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { emptySessionToDiscardAfterWatchdog } from "./watchdog-empty-session.ts"
import { shouldDismissOnNextSend } from "./send-restore-dismiss.ts"

test("新建的空会话：删", () => {
  assert.equal(emptySessionToDiscardAfterWatchdog(null, { sessionId: "ses_new", messages: [] }), "ses_new")
})

test("Enter 时已在老会话 / 有在跑的 run / 有待回助手 / 有内容：不删", () => {
  assert.equal(emptySessionToDiscardAfterWatchdog("ses_old", { sessionId: "ses_old", messages: [] }), null)
  assert.equal(emptySessionToDiscardAfterWatchdog(null, { sessionId: "ses_new", runId: "run_1", messages: [] }), null)
  assert.equal(
    emptySessionToDiscardAfterWatchdog(null, {
      sessionId: "ses_new",
      messages: [{ role: "assistant", content: "", streaming: true }]
    }),
    null
  )
  assert.equal(
    emptySessionToDiscardAfterWatchdog(null, { sessionId: "ses_new", messages: [{ role: "user", content: "hi" }] }),
    null
  )
  assert.equal(emptySessionToDiscardAfterWatchdog(null, { sessionId: null, messages: [] }), null)
  // #145 S1：running 被别的轮占着（排队首发在等它落下）也不删。
  assert.equal(emptySessionToDiscardAfterWatchdog(null, { sessionId: "ses_new", messages: [] }, true), null)
})

test("接线：看门狗 fail 里按 onlyIfEmpty 删空会话", () => {
  const src = readFileSync(new URL("./send-composer-run.ts", import.meta.url), "utf8")
  assert.match(src, /emptySessionToDiscardAfterWatchdog\(before\.sessionId, useChatStore\.getState\(\), otherHolds\)/)
  assert.match(src, /discardCreatedSession\(empty, \(\) => true, \{ keepComposer: true, onlyIfEmpty: true \}\)/)
})

test("红卡：没发出去类在下一发开始时收；「上一条还在准备」不收", () => {
  assert.equal(shouldDismissOnNextSend("SEND_FAILED_RESTORE"), true)
  assert.equal(shouldDismissOnNextSend("SEND_FAILED_RESTORE_MERGED"), true)
  assert.equal(shouldDismissOnNextSend("PREVIOUS_STILL_PREPARING"), false)
  assert.equal(shouldDismissOnNextSend(null), false)
})

test("leo soft：只图用户轮也算有内容，不当空会话删", () => {
  assert.equal(
    emptySessionToDiscardAfterWatchdog(null, {
      sessionId: "ses_img",
      messages: [{ role: "user", content: "", assets: [{ assetId: "ast_1" }] }]
    }),
    null
  )
})
