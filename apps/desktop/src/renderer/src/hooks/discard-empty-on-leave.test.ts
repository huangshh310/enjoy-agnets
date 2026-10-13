import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { emptySessionToDiscardOnLeave } from "./discard-empty-on-leave.ts"

const base = { sessionId: "ses_a", messages: [], running: false, runId: null, composer: "" }

test("luna P3：离开空「新对话」→ 删", () => {
  assert.equal(emptySessionToDiscardOnLeave(base, "ses_b"), "ses_a")
})

test("有消息 / 在跑 / 输入框有字 / 同会话 / 没会话：不删", () => {
  assert.equal(emptySessionToDiscardOnLeave({ ...base, messages: [{}] }, "ses_b"), null)
  assert.equal(emptySessionToDiscardOnLeave({ ...base, running: true }, "ses_b"), null)
  assert.equal(emptySessionToDiscardOnLeave({ ...base, runId: "run_1" }, "ses_b"), null)
  assert.equal(emptySessionToDiscardOnLeave({ ...base, composer: "稿" }, "ses_b"), null)
  assert.equal(emptySessionToDiscardOnLeave(base, "ses_a"), null)
  assert.equal(emptySessionToDiscardOnLeave({ ...base, sessionId: null }, "ses_b"), null)
})

test("接线：loadSession 切走前调 discardEmptySessionOnLeave；main 启动 pruneEmptySessions", () => {
  const life = readFileSync(new URL("./session-lifecycle.ts", import.meta.url), "utf8")
  assert.match(life, /discardEmptySessionOnLeave\(leaveStateSnapshot\(\), sessionId\)/)
  const main = readFileSync(new URL("../../../main/index.ts", import.meta.url), "utf8")
  assert.match(main, /pruneEmptySessions\(\)/)
})

test("leo BLOCK ④(a)：只有附件 / 引用 / 技能等附加物也不删", () => {
  assert.equal(emptySessionToDiscardOnLeave({ ...base, hasExtras: true }, "ses_b"), null)
})

test("leo BLOCK ④(b)：建会话 / 首发准备 / 排队中不删", () => {
  assert.equal(emptySessionToDiscardOnLeave({ ...base, createPending: true }, "ses_b"), null)
  assert.equal(emptySessionToDiscardOnLeave({ ...base, queuedSend: true }, "ses_b"), null)
  assert.equal(emptySessionToDiscardOnLeave({ ...base, preparingHint: true, preparingSessionId: "ses_a" }, "ses_b"), null)
  assert.equal(emptySessionToDiscardOnLeave({ ...base, preparingHint: true, preparingSessionId: null }, "ses_b"), null)
  // 别的会话在准备：不影响这个空壳
  assert.equal(emptySessionToDiscardOnLeave({ ...base, preparingHint: true, preparingSessionId: "ses_x" }, "ses_b"), "ses_a")
})

test("leo BLOCK ④(c)：loadSession 判空前先 flushComposerDomToStore（写回锁时 DOM 有字、store 还空）", () => {
  const src = readFileSync(new URL("./session-lifecycle.ts", import.meta.url), "utf8")
  assert.match(src, /flushComposerDomToStore\(\)\s*\n\s*discardEmptySessionOnLeave\(leaveStateSnapshot\(\), sessionId\)/)
  const snap = readFileSync(new URL("./leave-state-snapshot.ts", import.meta.url), "utf8")
  for (const k of ["composerHasExtras()", "isNewSessionCreatePending()", "hasQueuedComposerSend()", "preparingSessionId", "s.composer"]) {
    assert.ok(snap.includes(k), k)
  }
})

test("离开删除失败要留日志", () => {
  const src = readFileSync(new URL("./discard-empty-on-leave.ts", import.meta.url), "utf8")
  assert.match(src, /catch\(\(error: unknown\) => \{\s*console\.warn/)
})
