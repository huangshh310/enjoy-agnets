/**
 * 回挂对不上走中性条 + 放回输入框，不走红条。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { zhChat } from "../../../i18n/catalogs/zh/chat.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("回挂对不上：中性条 + 放回输入框，不自动发送", () => {
  const src = readFileSync(join(dir, "thread-notice-banner.tsx"), "utf8")
  assert.match(src, /restore_no_matching/)
  assert.match(src, /chat\.restoreNoMatching/)
  assert.match(src, /chat\.restoreInterrupted/)
  assert.match(src, /chat\.restartAbandoned/)
  assert.match(src, /chat\.resendLastPrompt/)
  assert.match(src, /data-testid="thread-resend"/)
  assert.match(src, /setComposer\(lastUser\.content\)/)
  assert.match(src, /focusComposerEndAfterPaint/)
  assert.doesNotMatch(src, /border-border-error-default/)
  assert.equal(zhChat.restoreNoMatching, "重启后对不上原来的审批，这一轮已结束。")
  assert.equal(zhChat.restoreInterrupted, "重启时这一步还没做完，为了安全没有自动继续。")
  assert.equal(zhChat.resendLastPrompt, "放回输入框")
  assert.equal(zhChat.restartAbandoned, "重启后已中断")
  assert.equal(zhChat.runStopped, "已停止")
})
