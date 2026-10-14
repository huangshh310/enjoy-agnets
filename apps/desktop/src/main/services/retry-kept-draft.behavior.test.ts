/**
 * leo（#135 条件过）：红卡「重试」（retryKeptDraft）输入框空、用户句还在库 → 原地重跑，库里用户行不多一条。
 * 走真 renderer retryKeptDraft 抓 agent.run 入参，再交给真 applyExplicitSessionTruncate / persistUserTurn 落库。
 * 若改成 sendComposerMessage（经输入框另发）这条必挂。
 */
import assert from "node:assert/strict"
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
        return { ok: true, runId: `run_rkd_${runs.length}` }
      }
      return undefined
    }
  })
}
;(globalThis as { window?: unknown }).window = { ide: bridge("") }

const { useChatStore } = await import("../../renderer/src/stores/chat-store.ts")
const { retryKeptDraft } = await import("../../renderer/src/hooks/retry-kept-draft.ts")

const sid = "ses_rkd"
function seed() {
  const db = getDatabase()
  db.prepare("INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run("ws_rkd", "ws", "/tmp", 1, 1)
  db.prepare("INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(sid, "ws_rkd", "t", 1, 1)
  db.prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(`u_${sid}`, sid, "user", "再试一次", 1000)
  rows = [{ id: `u_${sid}`, role: "user", content: "再试一次" }]
  useChatStore.setState({
    workspaceId: "ws_rkd", sessionId: sid, running: false, error: null, composer: "",
    messages: [{ id: `u_${sid}`, role: "user", content: "再试一次", createdAt: 1000 }]
  } as never)
}

const userRows = () =>
  getDatabase().prepare("SELECT id FROM messages WHERE session_id = ? AND role = 'user'").all(sid).map((r) => ({ id: (r as { id: string }).id }))

test("输入框空：红卡重试原地重跑原用户句，库里用户行仍 1 条、输入框仍空", async () => {
  seed()
  retryKeptDraft()
  for (let i = 0; i < 100 && runs.length === 0; i++) await new Promise((r) => setTimeout(r, 10))
  assert.equal(runs.length, 1, "应当发起一次重跑")
  const input = runs[0]!
  assert.equal(input.truncateAfterMessageId, `u_${sid}`, "原地重跑：截断锚在原用户句")
  const history = input.messages as Array<{ id: string; content: string }>
  const last = history.at(-1)!
  assert.equal(last.id, `u_${sid}`)
  const cut = applyExplicitSessionTruncate({
    sessionId: sid,
    afterMessageId: input.truncateAfterMessageId as string,
    expectedTailIds: input.expectedTailIds as string[],
    reason: "agent.run",
    persistUser: { content: last.content, messageId: last.id, attached: [] }
  })
  assert.equal(cut.ok, true)
  assert.deepEqual(userRows(), [{ id: `u_${sid}` }])
  assert.equal(useChatStore.getState().messages.filter((m) => m.role === "user").length, 1)
})
