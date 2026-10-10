/**
 * 发送口只认显式 Enter / 发送钮；入队与纠偏也在按下那一刻抓全文。
 */
import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const send = readFileSync(new URL("./runtime-interact/send-composer-run.ts", import.meta.url), "utf8")
const submit = readFileSync(new URL("./send-composer.ts", import.meta.url), "utf8")
const input = readFileSync(
  new URL("../components/ai-chat/composer/mentions/composer-input.tsx", import.meta.url),
  "utf8"
)
const create = readFileSync(new URL("./new-session-create.ts", import.meta.url), "utf8")
const queue = readFileSync(new URL("./queue-composer-send.ts", import.meta.url), "utf8")

test("无 prepared 的发送先 flush DOM，禁止只因 sessionId 空就发", () => {
  assert.match(send, /flushComposerDomToStore\(\)/)
  assert.match(send, /composerNeedsSessionReady\(\) && !prepared/)
  assert.match(create, /return createPending/)
  assert.doesNotMatch(create, /return !sessionId/)
})

test("Enter 与发送钮走 submitComposer；运行中 Enter 排队也 takeComposerText", () => {
  assert.match(input, /else onSend\(\)/)
  assert.match(submit, /resolveComposerIntent\(store\.running, requested\)/)
  assert.match(submit, /if \(intent === "send"\) return sendComposerMessage\(\)/)
  assert.match(submit, /const content = await takeComposerText\(\)/)
  assert.match(submit, /enqueueFollowup/)
  assert.match(submit, /steerPreparedText\(content\)/)
})

test("入队抓按下全文，点新对话取消残留队列", () => {
  assert.match(queue, /replaceQueuedSend\(trimmed/)
  assert.match(queue, /export function cancelQueuedComposerSend/)
  assert.match(send, /readComposerDomText\(\)/)
  assert.doesNotMatch(send, /flushed \?\? useChatStore\.getState\(\)\.composer/)
  const life = readFileSync(new URL("./session-lifecycle.ts", import.meta.url), "utf8")
  assert.match(life, /cancelQueuedComposerSend\(\)/)
})

test("组字中不发：输入框先看 shouldIgnoreComposerEnter", () => {
  assert.match(input, /shouldIgnoreComposerEnter/)
  assert.match(input, /onCompositionEnd/)
})

test("审批与 Dock 不自动发；空闲下一句仍走 submitComposer", () => {
  const approvalDir = new URL("../components/ai-chat/thread/approval/", import.meta.url)
  const dock = readFileSync(new URL("../components/ai-chat/attention/permission-dock.tsx", import.meta.url), "utf8")
  const approvalFiles = readdirSync(fileURLToPath(approvalDir)).filter(
    (name) => name.endsWith(".ts") || name.endsWith(".tsx")
  )
  assert.ok(approvalFiles.length > 0)
  for (const name of approvalFiles) {
    const src = readFileSync(new URL(name, approvalDir), "utf8")
    assert.doesNotMatch(src, /sendComposerMessage|submitComposer/)
  }
  assert.doesNotMatch(dock, /sendComposerMessage|submitComposer/)
})
