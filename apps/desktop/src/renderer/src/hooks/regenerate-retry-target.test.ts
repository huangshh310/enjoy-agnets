/**
 * jojo P1：提示卡「重新生成」重跑最初点的那一轮；非最后一条要先确认。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  clearRetryTarget,
  laterTurnCount,
  peekRetryTarget,
  rememberRetryTarget,
  resolveRetryTarget
} from "./regenerate-retry-target.ts"
import { reconcileTailWithDb } from "./session-truncate-intent.ts"

const view = [
  { id: "u1", role: "user" },
  { id: "msg_pending_1", role: "assistant" },
  { id: "u2", role: "user" },
  { id: "msg_pending_2", role: "assistant" }
]

test("记住的是用户句：刷新后助手 id 换成库 id，仍解析到第一轮那条回复，不是最后一轮", () => {
  rememberRetryTarget({ kind: "regenerate", sessionId: "s1", userId: "u1" })
  const refreshed = [
    { id: "u1", role: "user" },
    { id: "msg_db_a1", role: "assistant" },
    { id: "u2", role: "user" },
    { id: "msg_db_a2", role: "assistant" }
  ]
  assert.deepEqual(resolveRetryTarget("s1", refreshed), { kind: "regenerate", assistantId: "msg_db_a1" })
  assert.equal(resolveRetryTarget("s2", refreshed), null)
  clearRetryTarget()
  assert.equal(peekRetryTarget(), null)
  assert.equal(resolveRetryTarget("s1", refreshed), null)
})

test("编辑重发的目标带新内容；用户句没了就回落", () => {
  const target = { kind: "edit" as const, sessionId: "s1", userId: "u2", content: "new text" }
  assert.deepEqual(resolveRetryTarget("s1", view, target), { kind: "edit", userId: "u2", content: "new text" })
  assert.equal(resolveRetryTarget("s1", [{ id: "u1", role: "user" }], target), null)
})

test("laterTurnCount：第一条回复后面 1 轮，最后一条 0 轮", () => {
  assert.equal(laterTurnCount(view, "msg_pending_1"), 1)
  assert.equal(laterTurnCount(view, "msg_pending_2"), 0)
  assert.equal(laterTurnCount(view, "missing"), 0)
})

test("对账：视图 dedupe 掉的相邻重复用户句跟着前一句走；多出不同用户句仍拒绝", () => {
  const db = [
    { id: "u1", role: "user", content: "hi" },
    { id: "u1_dup", role: "user", content: "hi" },
    { id: "a1", role: "assistant", content: "x" }
  ]
  const v = [
    { id: "u1", role: "user", content: "hi" },
    { id: "msg_pending_1", role: "assistant", content: "x" }
  ]
  assert.deepEqual(reconcileTailWithDb({ view: v, db, anchorId: "u1", mode: "after" }), ["u1_dup", "a1"])
  const dbExtra = [...db, { id: "hb_u", role: "user", content: "beat" }]
  assert.equal(reconcileTailWithDb({ view: v, db: dbExtra, anchorId: "u1", mode: "after" }), null)
})

test("对账：视图里非占位 id 对不上（用户句换了）拒绝", () => {
  const db = [
    { id: "u1", role: "user" },
    { id: "a1", role: "assistant" },
    { id: "u2_other", role: "user" }
  ]
  const v = [
    { id: "u1", role: "user" },
    { id: "a1", role: "assistant" },
    { id: "u2", role: "user" }
  ]
  assert.equal(reconcileTailWithDb({ view: v, db, anchorId: "u1", mode: "after" }), null)
})

test("接线：regenerate / edit / rewind 开截前都读库对账，提示卡重试走记住的目标", () => {
  const regen = readFileSync(new URL("./regenerate-turn.ts", import.meta.url), "utf8")
  const rewind = readFileSync(new URL("./rewind-from-here.ts", import.meta.url), "utf8")
  const banner = readFileSync(
    new URL("../components/ai-chat/thread/thread-error-banner.tsx", import.meta.url),
    "utf8"
  )
  const actions = readFileSync(
    new URL("../components/ai-chat/thread/turns/assistant-actions.tsx", import.meta.url),
    "utf8"
  )
  assert.equal((regen.match(/await resolveTruncateTail\(/g) ?? []).length, 2)
  assert.doesNotMatch(regen, /tailIdsAfterKeep\(/)
  assert.match(rewind, /await resolveTruncateTail\(/)
  assert.doesNotMatch(rewind, /messages\.slice\(index\)\.map\(\(message\) => message\.id\)/)
  assert.match(banner, /resolveRetryTarget\(sessionId, messages\)/)
  assert.match(actions, /if \(laterTurns > 0\) setConfirmOpen\(true\)/)
})
