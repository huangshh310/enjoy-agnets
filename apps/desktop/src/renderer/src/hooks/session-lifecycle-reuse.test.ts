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
  assert.match(src, /if \(typedDuringCreate\) useChatStore\.setState\(\{ composer: typedDuringCreate \}\)/)
  assert.doesNotMatch(src, /idleComposerPatch\(\), composer: ""/)
})

test("归档调用容忍可选 deniedApprovals，不改 IPC", () => {
  const archive = readFileSync(new URL("./workspace-lifecycle.ts", import.meta.url), "utf8")
  assert.match(archive, /readDeniedApprovals/)
  assert.doesNotMatch(archive, /deniedApprovals:/)
})
