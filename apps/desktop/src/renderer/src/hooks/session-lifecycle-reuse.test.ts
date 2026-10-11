import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const src = readFileSync(new URL("./session-lifecycle.ts", import.meta.url), "utf8")

test("新建会话复用当前空会话并回焦 Composer", () => {
  assert.match(src, /isReusableEmptySession/)
  assert.match(src, /focusComposerAfterNewSession/)
  assert.match(src, /preparingHint: true/)
  assert.match(src, /discardCreatedSession/)
  assert.doesNotMatch(src, /listEmpty|purgeEmpty|recycleEmpty/)
})

test("创建完成不得清空正在打的字，也不得无 Enter 就发", () => {
  assert.match(src, /cancelQueuedComposerSend/)
  assert.match(src, /flushComposerDomToStore/)
  assert.match(src, /from "\.\/composer-dom"/)
  assert.match(src, /hasQueuedComposerSend\(\)/)
  assert.match(src, /setComposerWritebackHeld\(false\)/)
  assert.doesNotMatch(src, /typedDuringCreate/)
  assert.doesNotMatch(src, /syncComposerDom/)
  assert.doesNotMatch(src, /idleComposerPatch\(\), composer: ""/)
})

test("发送成功一律按已发正文清输入，禁止只清 prepared 路径", () => {
  const send = readFileSync(new URL("./runtime-interact/send-composer-run.ts", import.meta.url), "utf8")
  const queue = readFileSync(new URL("./queue-composer-send.ts", import.meta.url), "utf8")
  const draft = readFileSync(new URL("./runtime-interact/composer-draft.ts", import.meta.url), "utf8")
  assert.match(send, /clearSentComposerText\(payload\.content\)/)
  assert.doesNotMatch(send, /if \(prepared\) clearSentComposerText/)
  assert.match(queue, /syncComposerDom\(next, true\)/)
  assert.match(draft, /syncComposerDom\("", true\)/)
})

test("回挂家族 notice 不得被 idleComposerPatch 抹掉", () => {
  assert.match(src, /keepRestoreFamilyNotice/)
  assert.match(src, /notice: park.notice \?\? keptNotice/)
  assert.match(src, /notice: keptNotice/)
})

test("归档调用容忍可选 deniedApprovals，不改 IPC", () => {
  const archive = readFileSync(new URL("./workspace-lifecycle.ts", import.meta.url), "utf8")
  assert.match(archive, /readDeniedApprovals/)
  assert.doesNotMatch(archive, /deniedApprovals:/)
})
