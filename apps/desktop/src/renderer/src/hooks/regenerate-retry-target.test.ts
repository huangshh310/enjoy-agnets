/**
 * jojo P1 / leo #147 MF-1 / MF-2：
 * - 红卡重试只认挂在**这条**错误上的目标（没有模块级记忆）；429 等别的错误、新发送、切会话都盖掉；
 * - 点击时 regenerateAssistantTurn 重新读库、按 runId 严格绑，对不上就「有新内容」（真库测试见 main 侧）。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { laterTurnCount, resolveRetryTarget, retryTargetForError } from "./regenerate-retry-target.ts"
import { bindPlaceholdersByRunId, persistedIdOf, tailIdsAfterKeep } from "./session-truncate-intent.ts"
import { bindPersistedMessage } from "../stores/apply-stream-event.ts"
import { belongsToForeground } from "../stores/attention/foreground-event.ts"

const { useChatStore } = await import("../stores/chat-store.ts")

const TAIL_CHANGED_TEXT = "有新内容，请确认后再点一次。"
const view = [
  { id: "u1", role: "user" as const, content: "hello", createdAt: 1 },
  { id: "msg_pending_1", role: "assistant" as const, content: "stub-ok hello", createdAt: 2, runId: "run_1" },
  { id: "u2", role: "user" as const, content: "hello two", createdAt: 3 },
  { id: "msg_run_2", role: "assistant" as const, content: "stub-ok hello two", createdAt: 4, runId: "run_2" }
]

function bannerTarget() {
  const s = useChatStore.getState()
  return resolveRetryTarget(s.sessionId, s.messages, retryTargetForError(s.error, s.errorRetry))
}

test("MF-2：regenerate a1 →「有新内容」，红卡重试解析到 a1（刷新后助手 id 换了也按用户句找）", () => {
  const store = useChatStore.getState()
  store.setSession("s1", "t")
  store.setMessages(view)
  store.setError(TAIL_CHANGED_TEXT, { kind: "regenerate", sessionId: "s1", userId: "u1" })
  assert.deepEqual(bannerTarget(), { kind: "regenerate", assistantId: "msg_pending_1" })
  store.setMessages(view.map((m) => (m.id === "msg_pending_1" ? { ...m, id: "msg_db_a1" } : m)))
  assert.deepEqual(bannerTarget(), { kind: "regenerate", assistantId: "msg_db_a1" })
})

test("MF-2：之后正常发 u3、撞 429，红卡重试不得解析回旧的 a1（走原兜底）", () => {
  const store = useChatStore.getState()
  store.setSession("s1", "t")
  store.setMessages(view)
  store.setError(TAIL_CHANGED_TEXT, { kind: "regenerate", sessionId: "s1", userId: "u1" })
  useChatStore.getState().appendUserMessage("u3 text")
  assert.equal(useChatStore.getState().errorRetry, null)
  useChatStore.getState().setError("429 Too Many Requests")
  assert.equal(bannerTarget(), null)
})

test("MF-2：不经新发送、直接换成别的错误（429），旧目标也失效；切会话清掉", () => {
  const store = useChatStore.getState()
  store.setSession("s1", "t")
  store.setMessages(view)
  store.setError(TAIL_CHANGED_TEXT, { kind: "regenerate", sessionId: "s1", userId: "u1" })
  useChatStore.getState().setError("429 Too Many Requests")
  assert.equal(bannerTarget(), null)
  // 哪怕之后又出现同一句文案但没带目标，也不认。
  useChatStore.getState().setError(TAIL_CHANGED_TEXT)
  assert.equal(bannerTarget(), null)
  store.setError(TAIL_CHANGED_TEXT, { kind: "regenerate", sessionId: "s1", userId: "u1" })
  useChatStore.getState().setSession("s2", "other")
  assert.equal(useChatStore.getState().errorRetry, null)
  // 目标带会话：在别的会话不认。
  assert.equal(
    resolveRetryTarget("s2", view, { kind: "regenerate", sessionId: "s1", userId: "u1" }),
    null
  )
})

test("编辑重发的目标带新内容；用户句没了就回落", () => {
  const target = { kind: "edit" as const, sessionId: "s1", userId: "u2", content: "new text" }
  assert.deepEqual(resolveRetryTarget("s1", view, target), { kind: "edit", userId: "u2", content: "new text" })
  assert.equal(resolveRetryTarget("s1", [{ id: "u1", role: "user" }], target), null)
})

test("laterTurnCount：第一条回复后面 1 轮，最后一条 0 轮", () => {
  assert.equal(laterTurnCount(view, "msg_pending_1"), 1)
  assert.equal(laterTurnCount(view, "msg_run_2"), 0)
  assert.equal(laterTurnCount(view, "missing"), 0)
})

test("MF-1：占位气泡只绑同 runId 的那一条库助手行；不按位置、不吞视图没有的行、不跳重复用户句", () => {
  const runIdOf = (content: string) => (JSON.parse(content) as { runId?: string }).runId
  const row = (id: string, role: string, runId?: string) => ({
    id,
    role,
    content: JSON.stringify(runId ? { runId } : {})
  })
  const db = [row("u1", "user"), row("A1", "assistant", "run_1"), row("u2", "user"), row("A2", "assistant", "run_2")]
  assert.deepEqual(tailIdsAfterKeep(bindPlaceholdersByRunId(view, db, runIdOf), "u1"), ["A1", "u2", "A2"])
  // 位置上有一条后台助手行（runId 不同）：不绑，占位不进名单。
  const bg = [row("u1", "user"), row("BG", "assistant", "run_hb"), row("u2", "user"), row("A2", "assistant", "run_2")]
  assert.deepEqual(tailIdsAfterKeep(bindPlaceholdersByRunId(view, bg, runIdOf), "u1"), ["u2", "A2"])
  // 同 runId 两行：歧义不绑。
  const dup = [...db, row("A2b", "assistant", "run_2")]
  assert.deepEqual(tailIdsAfterKeep(bindPlaceholdersByRunId(view, dup, runIdOf), "u2"), [])
  // 重复用户句不跳：视图里没有的用户行不会被吸收（名单不含它，交给 main 判 STALE）。
  const repeat = [...db, row("u2dup", "user")]
  assert.equal(tailIdsAfterKeep(bindPlaceholdersByRunId(view, repeat, runIdOf), "u1").includes("u2dup"), false)
})

test("MF-1：message.persisted 绑到同 runId 气泡的 persistedId，不改 id；已有同 id 不动", () => {
  const next = bindPersistedMessage(view as never, { runId: "run_2", messageId: "A2", role: "assistant" })
  const bubble = next.find((m) => m.runId === "run_2")!
  assert.equal(bubble.id, "msg_run_2")
  assert.equal(bubble.persistedId, "A2")
  assert.equal(persistedIdOf(bubble), "A2")
  assert.equal(persistedIdOf({ id: "msg_pending_9" }), null)
  assert.equal(persistedIdOf({ id: "msg_user_abc" }), "msg_user_abc")
  assert.equal(bindPersistedMessage(next, { runId: "run_2", messageId: "A2", role: "assistant" }), next)
  assert.equal(bindPersistedMessage(view as never, { runId: "run_x", messageId: "Z", role: "assistant" }), view)
})

test("MF-1：message.persisted 晚于 run.end 也进前台（只认会话）；别的会话不进", () => {
  const event = { type: "message.persisted" as const, runId: "run_2", messageId: "A2", role: "assistant" as const }
  assert.equal(belongsToForeground(event, "s1", null, false, "s1"), true)
  assert.equal(belongsToForeground(event, "s1", null, false, "s2"), false)
  assert.equal(belongsToForeground(event, "s1", null, false, undefined), false)
})

test("接线：regenerate / edit / rewind 开截前读库按 runId 绑；红卡只认这条错误挂的目标", () => {
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
  const target = readFileSync(new URL("./regenerate-retry-target.ts", import.meta.url), "utf8")
  assert.equal((regen.match(/await resolveTruncateTail\(/g) ?? []).length, 2)
  assert.match(regen, /setError\(translateTruncateNotice\(code\), opts\.retryTarget\)/)
  assert.match(rewind, /await resolveTruncateTail\(/)
  assert.match(banner, /retryTargetForError\(error, errorRetry\)/)
  assert.match(actions, /if \(laterTurns > 0\) setConfirmOpen\(true\)/)
  assert.doesNotMatch(target, /^let current/m)
})
