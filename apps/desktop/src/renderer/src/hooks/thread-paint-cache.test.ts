import assert from "node:assert/strict"
import { test } from "node:test"
import {
  clearThreadPaintCache,
  messagesForSessionSwitch,
  shouldReplaceThreadPaint,
  threadPaintStamp
} from "./thread-paint-cache.ts"

test("切走再切回先拿回该会话的转录，不拿上一份，也不是空白", () => {
  clearThreadPaintCache()
  const first = messagesForSessionSwitch({
    leavingSessionId: "a",
    leavingMessages: [{ id: "1", content: "from a" }],
    nextSessionId: "b"
  })
  assert.deepEqual(first, [])
  const back = messagesForSessionSwitch({
    leavingSessionId: "b",
    leavingMessages: [{ id: "2", content: "from b" }],
    nextSessionId: "a"
  })
  assert.equal(back[0]?.content, "from a")
  assert.notEqual(back[0]?.content, "from b")
})

test("工具状态或正文变了才重挂", () => {
  const current = [{ id: "1", content: "hi", tools: [{ id: "t", state: "approval-requested" }] }]
  const same = [{ id: "1", content: "hi", tools: [{ id: "t", state: "approval-requested" }] }]
  const decided = [{ id: "1", content: "hi", tools: [{ id: "t", state: "output-available" }] }]
  assert.equal(threadPaintStamp(current), threadPaintStamp(same))
  assert.equal(shouldReplaceThreadPaint(current, same), false)
  assert.equal(shouldReplaceThreadPaint(current, decided), true)
  assert.equal(shouldReplaceThreadPaint(current, current), false)
  assert.equal(shouldReplaceThreadPaint([], [{ id: "1", content: "hi" }]), true)
  assert.equal(shouldReplaceThreadPaint([], []), false)
})
