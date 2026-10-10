/**
 * Composer 从首帧只挂一份，发送先刷 DOM 再占 running。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))

test("ChatThreadBody 单实例 Composer，发送先 flush 再 setRunning", () => {
  const stage = readFileSync(join(dir, "chat-stage.tsx"), "utf8")
  const start = readFileSync(join(dir, "empty-session-start.tsx"), "utf8")
  const send = readFileSync(join(dir, "../../../hooks/runtime-interact/send-composer-run.ts"), "utf8")
  const draft = readFileSync(join(dir, "../../../hooks/runtime-interact/composer-draft.ts"), "utf8")
  assert.equal([...stage.matchAll(/<ChatComposerCluster/g)].length, 1)
  assert.doesNotMatch(stage, /key=\{sessionId\}/)
  assert.doesNotMatch(start, /ChatComposerCluster/)
  assert.match(draft, /flushComposerDomToStore/)
  assert.match(send, /flushComposerDomToStore\(\)/)
  const flushAt = send.indexOf("flushComposerDomToStore()")
  const runningAt = send.indexOf("store.setRunning(true)")
  assert.ok(flushAt >= 0 && runningAt > flushAt, "flush 必须在 setRunning 之前")
})
