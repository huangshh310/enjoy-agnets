import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { approvalOtherChatNotice, parseApprovalOtherChatNotice } from "./approval-other-chat.ts"

test("提示码往返：带标题 / 不带标题", () => {
  assert.deepEqual(parseApprovalOtherChatNotice(approvalOtherChatNotice("会话B")), { title: "会话B" })
  assert.deepEqual(parseApprovalOtherChatNotice(approvalOtherChatNotice(null)), { title: null })
  assert.equal(parseApprovalOtherChatNotice("USER_ABORTED"), null)
  assert.equal(parseApprovalOtherChatNotice(null), null)
})

// 接线（node:test 渲染不了 .tsx）：提示条认得这条提示，画中性灰点，不走红卡。
test("接线：ThreadNoticeBanner 把「审批属于别的对话」画成中性灰提示", () => {
  const src = readFileSync(new URL("../components/ai-chat/thread/thread-notice-banner.tsx", import.meta.url), "utf8")
  assert.match(src, /const otherChat = parseApprovalOtherChatNotice\(notice\)/)
  assert.match(src, /approvalOtherChatText\(t, otherChat\.title\)/)
  assert.match(src, /stopped \|\| restoreFamily \|\| catchUpTimeout \|\| otherChat \? "bg-text-tertiary"/)
})
