/**
 * jojo P2（#150 gate2）：失败轮（没有助手回复）点红卡「重新生成」不得在库里多插一条用户句。
 * 走真 renderer 重跑（regenerateUserTurn / editAndResendUserTurn）抓 agent.run 入参，
 * 再交给真 applyExplicitSessionTruncate + persistUserTurn 落库，数库里的用户行。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const L = await import("./regenerate-tail.behavior.load.ts")
const { applyExplicitSessionTruncate, getDatabase } = L

const runs: Array<Record<string, unknown>> = []
let rows: Array<{ id: string; role: string; content: string }> = []
function bridge(path: string): unknown {
  return new Proxy(() => undefined, {
    get: (_t, key) => bridge(`${path}.${String(key)}`),
    apply: async (_t, _this, args) => {
      if (path === ".session.messages") return rows
      if (path === ".agent.run") {
        runs.push(args[0] as Record<string, unknown>)
        return { ok: true, runId: `run_regen_dup_${runs.length}` }
      }
      return undefined
    }
  })
}
;(globalThis as { window?: unknown }).window = { ide: bridge("") }

const { useChatStore } = await import("../../renderer/src/stores/chat-store.ts")
const { regenerateUserTurn, editAndResendUserTurn, retryFailedUserTurn } = await import("../../renderer/src/hooks/regenerate-turn.ts")

function seed(sid: string, content: string) {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_regen_dup", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sid, "ws_regen_dup", "dup", 1, 1)
  // 很久以前落的（重启后）：时间窗去重救不了。
  db.prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
    `u_${sid}`,
    sid,
    "user",
    content,
    1000
  )
  rows = [{ id: `u_${sid}`, role: "user", content }]
  useChatStore.setState({
    workspaceId: "ws_regen_dup",
    sessionId: sid,
    running: false,
    error: null,
    messages: [{ id: `u_${sid}`, role: "user", content, createdAt: 1000 }]
  } as never)
}

function userRows(sid: string): Array<{ id: string; content: string }> {
  return getDatabase()
    .prepare("SELECT id, content FROM messages WHERE session_id = ? AND role = 'user'")
    .all(sid).map((r) => ({ ...(r as { id: string; content: string }) }))
}

/** main 侧：按 beginAgentRun 的截断分支落库（persistUser 取 history 最后一条）。 */
function applyInMain(sid: string, input: Record<string, unknown>) {
  const history = input.messages as Array<{ id: string; role: string; content: string }>
  const last = history.at(-1)!
  const cut = applyExplicitSessionTruncate({
    sessionId: sid,
    afterMessageId: input.truncateAfterMessageId as string,
    expectedTailIds: input.expectedTailIds as string[],
    reason: "agent.run",
    persistUser: { content: last.content, messageId: last.id, attached: [] }
  })
  assert.equal(cut.ok, true)
}

test("失败轮重新生成：复用原用户句 id，库里用户行数不变", async () => {
  const sid = "ses_regen_dup_a"
  seed(sid, "修登录页")
  runs.length = 0
  await regenerateUserTurn(`u_${sid}`)
  assert.equal(runs.length, 1)
  assert.equal(runs[0]!.truncateAfterMessageId, `u_${sid}`)
  applyInMain(sid, runs[0]!)
  assert.deepEqual(userRows(sid), [{ id: `u_${sid}`, content: "修登录页" }])
})

test("编辑重发语义不变：原地改内容，不多一行", async () => {
  const sid = "ses_regen_dup_b"
  seed(sid, "旧话")
  useChatStore.setState({ running: false } as never)
  runs.length = 0
  await editAndResendUserTurn(`u_${sid}`, "新话")
  assert.equal(runs.length, 1)
  applyInMain(sid, runs[0]!)
  assert.deepEqual(userRows(sid), [{ id: `u_${sid}`, content: "新话" }])
})

test("接线：红卡没有助手回复时走 regenerateUserTurn，不经输入框另发", () => {
  const src = readFileSync(
    new URL("../../renderer/src/components/ai-chat/thread/thread-error-banner.tsx", import.meta.url),
    "utf8"
  )
  // leo：这一支不先 setError(null)——真起跑时 regenerate 自己收卡。
  assert.match(src, /\} else if \(lastUser\) \{\s*void retryFailedUserTurn\(lastUser\)\s*\}/)
  assert.doesNotMatch(src, /setComposer\(lastUser\.content\)/)
})

test("leo：重新生成静默没起跑 → 红卡留着、原话放回输入框，不自动发", async () => {
  const sid = "ses_regen_dup_c"
  seed(sid, "原来的话")
  useChatStore.setState({ composer: "" } as never)
  useChatStore.getState().setError("boom")
  runs.length = 0
  assert.equal(await retryFailedUserTurn({ id: "u_missing", content: "原来的话" }), false)
  assert.equal(await retryFailedUserTurn({ content: "原来的话" }), false)
  assert.equal(runs.length, 0)
  assert.equal(useChatStore.getState().error, "boom")
  assert.equal(useChatStore.getState().composer, "原来的话")
})

test("leo：真起跑才收红卡", async () => {
  const sid = "ses_regen_dup_d"
  seed(sid, "再试")
  useChatStore.getState().setError("boom")
  runs.length = 0
  assert.equal(await retryFailedUserTurn({ id: `u_${sid}`, content: "再试" }), true)
  assert.equal(runs.length, 1)
  assert.equal(useChatStore.getState().error, null)
})

test("luna P2：没起跑时写回锁还挂着（建会话 / 首发入队留下）也要把原话放回输入框（store + DOM）", async () => {
  const { setComposerWritebackHeld, isComposerWritebackHeld } = await import(
    "../../renderer/src/hooks/composer-sync-lock.ts"
  )
  const { shouldHoldComposerStoreSync } = await import("../../renderer/src/hooks/composer-dom.ts")
  const sid = "ses_regen_dup_e"
  seed(sid, "要还回来的话")
  const el = { value: "", getAttribute: (k: string) => (k === "data-testid" ? "composer-input" : null) }
  ;(globalThis as { document?: unknown }).document = {
    activeElement: el,
    querySelector: () => el
  }
  try {
    useChatStore.setState({ composer: "" } as never)
    useChatStore.getState().setError("boom")
    setComposerWritebackHeld(true)
    assert.equal(shouldHoldComposerStoreSync(), true, "前提：store→输入框同步被拦")
    runs.length = 0
    assert.equal(await retryFailedUserTurn({ id: "u_missing", content: "要还回来的话" }), false)
    assert.equal(runs.length, 0)
    assert.equal(useChatStore.getState().error, "boom")
    assert.equal(useChatStore.getState().composer, "要还回来的话")
    assert.equal(el.value, "要还回来的话", "输入框 DOM 也得看见")
    assert.equal(isComposerWritebackHeld(), false, "解锁，后续打字能同步")
  } finally {
    setComposerWritebackHeld(false)
    delete (globalThis as { document?: unknown }).document
  }
})

test("leo：输入框已有后打的字 → 原样保留不拼原话（锁挂着 / 没挂都一样），只解锁", async () => {
  const { setComposerWritebackHeld, isComposerWritebackHeld } = await import(
    "../../renderer/src/hooks/composer-sync-lock.ts"
  )
  const sid = "ses_regen_dup_f"
  seed(sid, "原话")
  for (const held of [true, false]) {
    const el = { value: "后打的 B", getAttribute: (k: string) => (k === "data-testid" ? "composer-input" : null) }
    ;(globalThis as { document?: unknown }).document = { activeElement: el, querySelector: () => el }
    try {
      useChatStore.setState({ composer: "后打的 B" } as never)
      useChatStore.getState().setError("boom")
      setComposerWritebackHeld(held)
      runs.length = 0
      assert.equal(await retryFailedUserTurn({ id: "u_missing", content: "原话" }), false)
      assert.equal(runs.length, 0)
      assert.equal(useChatStore.getState().composer, "后打的 B", `held=${held}`)
      assert.equal(el.value, "后打的 B", `held=${held}`)
      assert.equal(useChatStore.getState().error, "boom")
      assert.equal(isComposerWritebackHeld(), false)
    } finally {
      setComposerWritebackHeld(false)
      delete (globalThis as { document?: unknown }).document
    }
  }
})
