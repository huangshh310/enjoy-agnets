/**
 * jojo P1 + leo #147 MF-1：重新生成 / rewind 的截断名单只用权威落库 id。
 * - main 落库助手行后发 `message.persisted`，renderer 绑到同 runId 气泡（persistedId）；
 * - 仍是占位的气泡（没落库 / 漏了回报）当不存在：不进名单；
 * - 库里任何视图没见过的行（P5–P9 后台行）→ main STALE → 刷新后原名单仍不同 → 「有新内容」，什么都不删。
 * 走真库 + 真 applyExplicitSessionTruncate + 真 decideTruncateRetry。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  bindPlaceholdersByRunId,
  runIdOfAssistantContent,
  tailIdsAfterKeep,
  tailIdsFromInclusive,
  type TailMessage
} from "../../renderer/src/hooks/session-truncate-intent.ts"
import { decideTruncateRetry } from "../../renderer/src/hooks/truncate-retry.ts"
import { bindPersistedMessage } from "../../renderer/src/stores/apply-stream-event.ts"

const L = await import("./regenerate-tail.behavior.load.ts")
const { applyExplicitSessionTruncate, getDatabase, persistFinishedAssistant, persistUserTurn } = L

const tick = () => new Promise((resolve) => setTimeout(resolve, 3))

function seed(sessionId: string) {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_regen_tail", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, "ws_regen_tail", "regen", 1, 1)
}

/** leo 探针同款：直接插行，created_at 递增。 */
function seedRows(sessionId: string, rows: Array<[string, string, string?]>) {
  seed(sessionId)
  let t = 1000
  for (const [id, role, content] of rows) {
    getDatabase()
      .prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(id, sessionId, role, content ?? `c:${id}`, t++)
  }
}

function remainingIds(sessionId: string): string[] {
  return (
    getDatabase()
      .prepare("SELECT id FROM messages WHERE session_id = ? ORDER BY created_at ASC, id ASC")
      .all(sessionId) as Array<{ id: string }>
  ).map((row) => row.id)
}

function assistantText(sessionId: string, text: string, runId: string): string {
  const id = persistFinishedAssistant({
    sessionId,
    content: text,
    reasoning: "",
    tools: [],
    startedAt: Date.now(),
    extras: {},
    runKind: "agent",
    runId
  })
  assert.ok(id)
  return id
}

function assistantToolOnly(sessionId: string, runId: string): string {
  const id = persistFinishedAssistant({
    sessionId,
    content: "",
    reasoning: "",
    tools: [
      { id: `tool_${runId}`, name: "bash", state: "output-available", args: { command: "ls" }, result: { stdout: "a" } }
    ],
    startedAt: Date.now(),
    extras: {},
    runKind: "agent",
    runId
  })
  assert.ok(id)
  return id
}

function dbRowsOf(sessionId: string) {
  return getDatabase()
    .prepare("SELECT id, role, content FROM messages WHERE session_id = ? ORDER BY created_at ASC, id ASC")
    .all(sessionId) as Array<{ id: string; role: string; content: string }>
}

/**
 * 模拟 regenerate（resolveTruncateTail 同路径）：读库 → 只按 runId 严格绑占位气泡 → 名单 → main 截断；
 * STALE 时按 truncate-retry 规则刷新（库 id）后再决定，只有尾巴完全相同才带原名单重试。
 */
function regenerate(sessionId: string, view: TailMessage[], keepId: string, mode: "after" | "from" = "after") {
  const bound = bindPlaceholdersByRunId(view, dbRowsOf(sessionId), runIdOfAssistantContent)
  const expectedTailIds = mode === "after" ? tailIdsAfterKeep(bound, keepId) : tailIdsFromInclusive(bound, keepId)
  const call = () =>
    applyExplicitSessionTruncate({
      sessionId,
      ...(mode === "after" ? { afterMessageId: keepId } : { fromMessageId: keepId }),
      expectedTailIds,
      reason: mode === "after" ? "agent.run" : "rewind"
    })
  const first = call()
  if (first.ok) return { expectedTailIds, result: first }
  const decision = decideTruncateRetry({
    mode,
    anchorId: keepId,
    expectedTailIds,
    refreshedIds: remainingIds(sessionId)
  })
  if (!decision.retry) return { expectedTailIds, result: { ok: false as const, code: decision.code } }
  return { expectedTailIds, result: call() }
}

/** hello / hello two（第二轮只有工具 part）；视图助手气泡占位 id，main 回报后绑 persistedId。 */
async function twoTurnSession(sessionId: string) {
  seed(sessionId)
  const u1 = `${sessionId}_u1`
  const u2 = `${sessionId}_u2`
  persistUserTurn(sessionId, "hello", [], u1)
  await tick()
  const a1 = assistantText(sessionId, "stub-ok hello", `${sessionId}_run1`)
  await tick()
  persistUserTurn(sessionId, "hello two", [], u2)
  await tick()
  const a2 = assistantToolOnly(sessionId, `${sessionId}_run2`)
  let view: TailMessage[] & Array<{ role: string }> = [
    { id: u1, role: "user" },
    { id: "msg_pending_1", role: "assistant", runId: `${sessionId}_run1` },
    { id: u2, role: "user" },
    { id: `msg_${sessionId}_run2`, role: "assistant", runId: `${sessionId}_run2` }
  ] as never
  return { u1, u2, a1, a2, view, setView: (next: typeof view) => (view = next) }
}

function bindAll<T extends TailMessage & { role: string }>(view: T[], pairs: Array<[string, string]>): T[] {
  let next = view as never as Parameters<typeof bindPersistedMessage>[0]
  for (const [runId, messageId] of pairs) next = bindPersistedMessage(next, { runId, messageId, role: "assistant" })
  return next as never as T[]
}

test("根因：占位 id 直接当名单，main 判 STALE（什么都没删）", async () => {
  const sessionId = "ses_regen_root"
  const { u1, view } = await twoTurnSession(sessionId)
  const before = remainingIds(sessionId)
  const raw = view.slice(view.findIndex((m) => m.id === u1) + 1).map((m) => m.id)
  const result = applyExplicitSessionTruncate({ sessionId, afterMessageId: u1, expectedTailIds: raw, reason: "agent.run" })
  assert.deepEqual(result, { ok: false, code: "TRUNCATE_STALE_SNAPSHOT" })
  assert.deepEqual(remainingIds(sessionId), before)
})

test("绑上 main 回报的真 id：重新生成第一条回复，正好删第一条回复及后面一轮（含只有工具的行）", async () => {
  const sessionId = "ses_regen_first"
  const { u1, u2, a1, a2, view } = await twoTurnSession(sessionId)
  const bound = bindAll(view, [
    [`${sessionId}_run1`, a1],
    [`${sessionId}_run2`, a2]
  ])
  const { expectedTailIds, result } = regenerate(sessionId, bound, u1)
  assert.deepEqual(expectedTailIds, [a1, u2, a2])
  assert.deepEqual(result, { ok: true, deleted: 3 })
  assert.deepEqual(remainingIds(sessionId), [u1])
})

test("最后一轮（只有工具 part 的助手行）重新生成：只删这一条", async () => {
  const sessionId = "ses_regen_tool_last"
  const { u1, u2, a1, a2, view } = await twoTurnSession(sessionId)
  const bound = bindAll(view, [
    [`${sessionId}_run1`, a1],
    [`${sessionId}_run2`, a2]
  ])
  const { result } = regenerate(sessionId, bound, u2)
  assert.deepEqual(result, { ok: true, deleted: 1 })
  assert.deepEqual(remainingIds(sessionId), [u1, a1, u2])
})

test("rewind（from）同样只用真 id", async () => {
  const sessionId = "ses_regen_rewind"
  const { u1, u2, a1, a2, view } = await twoTurnSession(sessionId)
  const bound = bindAll(view, [
    [`${sessionId}_run1`, a1],
    [`${sessionId}_run2`, a2]
  ])
  assert.deepEqual(tailIdsFromInclusive(bound, u1), [u1, a1, u2, a2])
})

test("没收到回报也行：占位气泡按 runId 严格绑到同 run 的库行（两轮重新生成第一条，删 3 行）", async () => {
  const sessionId = "ses_regen_runid_only"
  const { u1, u2, a1, a2, view } = await twoTurnSession(sessionId)
  const { expectedTailIds, result } = regenerate(sessionId, view, u1)
  assert.deepEqual(expectedTailIds, [a1, u2, a2])
  assert.deepEqual(result, { ok: true, deleted: 3 })
  assert.deepEqual(remainingIds(sessionId), [u1])
})

test("气泡没有 runId / runId 对不上：绑不上 → 不进名单 → 有新内容，不删", async () => {
  const sessionId = "ses_regen_missed"
  const { u1, view } = await twoTurnSession(sessionId)
  const stripped = view.map((m, i) => (i === 3 ? { ...m, id: "msg_pending_2", runId: "run_someone_else" } : m))
  const before = remainingIds(sessionId)
  const { expectedTailIds, result } = regenerate(sessionId, stripped, u1)
  assert.equal(expectedTailIds.includes(`${sessionId}_u2`), true)
  assert.equal(expectedTailIds.length, 2)
  assert.deepEqual(result, { ok: false, code: "TRUNCATE_TAIL_CHANGED" })
  assert.deepEqual(remainingIds(sessionId), before)
})

test("心跳 / 自动化行永远进不了名单：它们的 runId 不是前台气泡的 runId", async () => {
  const sessionId = "ses_regen_hb_never"
  const { u1, view } = await twoTurnSession(sessionId)
  await tick()
  persistUserTurn(sessionId, "heartbeat", [], `${sessionId}_hb_u`)
  await tick()
  const hbA = assistantText(sessionId, "hb reply", `${sessionId}_hb_run`)
  await tick()
  const autoA = assistantText(sessionId, "automation reply", `${sessionId}_auto_run`)
  // 一个没 runId 的前台占位 + 两个后台 run：都不得被绑上。
  const ghost = [...view, { id: "msg_pending_ghost", role: "assistant" }]
  const bound = bindPlaceholdersByRunId(ghost, dbRowsOf(sessionId), runIdOfAssistantContent)
  const listed = tailIdsAfterKeep(bound, u1)
  assert.equal(listed.includes(hbA), false)
  assert.equal(listed.includes(autoA), false)
  assert.equal(listed.includes(`${sessionId}_hb_u`), false)
  const before = remainingIds(sessionId)
  const { result } = regenerate(sessionId, ghost, u1)
  assert.deepEqual(result, { ok: false, code: "TRUNCATE_TAIL_CHANGED" })
  assert.deepEqual(remainingIds(sessionId), before)
})

test("同一 runId 库里有两条助手行（续跑另起行）：有歧义，不绑 → 有新内容", async () => {
  const sessionId = "ses_regen_dup_run"
  const { u2, view } = await twoTurnSession(sessionId)
  await tick()
  getDatabase()
    .prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(
      `${sessionId}_a2b`,
      sessionId,
      "assistant",
      JSON.stringify({ v: 1, content: "more", runId: `${sessionId}_run2` }),
      Date.now()
    )
  const before = remainingIds(sessionId)
  const { expectedTailIds, result } = regenerate(sessionId, view, u2)
  assert.deepEqual(expectedTailIds, [])
  assert.deepEqual(result, { ok: false, code: "TRUNCATE_TAIL_CHANGED" })
  assert.deepEqual(remainingIds(sessionId), before)
})

// ---- leo #147 探针（/workspace/rev147/map.test.ts）回归 ----

test("P5：a2 没落库（出错 / 中断空轮），之后后台写了 bg_a；重新生成 a2 → 有新内容，不删", () => {
  const s = "ses_p147_5"
  seedRows(s, [[`${s}_u1`, "user"], [`${s}_a1`, "assistant"], [`${s}_u2`, "user"], [`${s}_bga`, "assistant", "BACKGROUND"]])
  const view = [
    { id: `${s}_u1`, role: "user" },
    { id: `${s}_a1`, role: "assistant" },
    { id: `${s}_u2`, role: "user" },
    { id: "msg_pending_2", role: "assistant" }
  ]
  const before = remainingIds(s)
  const { expectedTailIds, result } = regenerate(s, view, `${s}_u2`)
  assert.deepEqual(expectedTailIds, [])
  assert.deepEqual(result, { ok: false, code: "TRUNCATE_TAIL_CHANGED" })
  assert.deepEqual(remainingIds(s), before)
})

test("P6：a1 没落库、bg_a 占了它的位置；重新生成 a1 → 有新内容，不删", () => {
  const s = "ses_p147_6"
  seedRows(s, [[`${s}_u1`, "user"], [`${s}_bga`, "assistant", "BACKGROUND"], [`${s}_u2`, "user"], [`${s}_a2`, "assistant"]])
  const view = [
    { id: `${s}_u1`, role: "user" },
    { id: "msg_pending_1", role: "assistant" },
    { id: `${s}_u2`, role: "user" },
    { id: "msg_pending_2", role: "assistant", persistedId: `${s}_a2` }
  ]
  const before = remainingIds(s)
  const { expectedTailIds, result } = regenerate(s, view, `${s}_u1`)
  assert.deepEqual(expectedTailIds, [`${s}_u2`, `${s}_a2`])
  assert.deepEqual(result, { ok: false, code: "TRUNCATE_TAIL_CHANGED" })
  assert.deepEqual(remainingIds(s), before)
})

test("P7：rewind 从 u2，a2 没落库，bg_a → 有新内容，不删", () => {
  const s = "ses_p147_7"
  seedRows(s, [[`${s}_u1`, "user"], [`${s}_a1`, "assistant"], [`${s}_u2`, "user"], [`${s}_bga`, "assistant", "BACKGROUND"]])
  const view = [
    { id: `${s}_u1`, role: "user" },
    { id: `${s}_a1`, role: "assistant" },
    { id: `${s}_u2`, role: "user" },
    { id: "msg_pending_2", role: "assistant" }
  ]
  const before = remainingIds(s)
  const { expectedTailIds, result } = regenerate(s, view, `${s}_u2`, "from")
  assert.deepEqual(expectedTailIds, [`${s}_u2`])
  assert.deepEqual(result, { ok: false, code: "TRUNCATE_TAIL_CHANGED" })
  assert.deepEqual(remainingIds(s), before)
})

test("P8：u2 失败后心跳写了同句 x_u + x_a（不跳过重复用户句）；重新生成 a2 → 有新内容，不删", () => {
  const s = "ses_p147_8"
  seedRows(s, [
    [`${s}_u1`, "user"],
    [`${s}_a1`, "assistant"],
    [`${s}_u2`, "user", "daily check"],
    [`${s}_xu`, "user", "daily check"],
    [`${s}_xa`, "assistant", "BG REPLY"]
  ])
  const view = [
    { id: `${s}_u1`, role: "user" },
    { id: `${s}_a1`, role: "assistant" },
    { id: `${s}_u2`, role: "user" },
    { id: "msg_pending_2", role: "assistant" }
  ]
  const before = remainingIds(s)
  const { result } = regenerate(s, view, `${s}_u2`)
  assert.deepEqual(result, { ok: false, code: "TRUNCATE_TAIL_CHANGED" })
  assert.deepEqual(remainingIds(s), before)
})

test("P9：u2 前多一条视图没见过的助手行；重新生成 a1 → 有新内容，不删", () => {
  const s = "ses_p147_9"
  seedRows(s, [[`${s}_u1`, "user"], [`${s}_a1`, "assistant"], [`${s}_xa`, "assistant"], [`${s}_u2`, "user"]])
  const view = [
    { id: `${s}_u1`, role: "user" },
    { id: `${s}_a1`, role: "assistant" },
    { id: `${s}_u2`, role: "user" }
  ]
  const before = remainingIds(s)
  const { result } = regenerate(s, view, `${s}_u1`)
  assert.deepEqual(result, { ok: false, code: "TRUNCATE_TAIL_CHANGED" })
  assert.deepEqual(remainingIds(s), before)
})

test("P1/P2 心跳尾巴：真 id 名单也对不上 → 有新内容，不删", async () => {
  const sessionId = "ses_regen_hb"
  const { u1, a1, a2, view } = await twoTurnSession(sessionId)
  await tick()
  persistUserTurn(sessionId, "heartbeat", [], `${sessionId}_hb_u`)
  await tick()
  assistantText(sessionId, "hb reply", `${sessionId}_hb_run`)
  const bound = bindAll(view, [
    [`${sessionId}_run1`, a1],
    [`${sessionId}_run2`, a2]
  ])
  const before = remainingIds(sessionId)
  const { result } = regenerate(sessionId, bound, u1)
  assert.deepEqual(result, { ok: false, code: "TRUNCATE_TAIL_CHANGED" })
  assert.deepEqual(remainingIds(sessionId), before)
})

// ---- main 回报 ----

test("main：助手行首次落库回报 message.persisted（真 id、同 runId），同一行再 checkpoint 不重复回报", () => {
  const runId = "run_announce_1"
  const sessionId = "ses_announce_1"
  seed(sessionId)
  L.insertRun(getDatabase(), {
    id: runId,
    sessionId,
    workspaceId: "ws_regen_tail",
    kind: "agent",
    status: "running",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null,
    usageJson: null
  })
  L.holdAgentRun({
    runId,
    window: { isDestroyed: () => false, webContents: { send() {} } } as never,
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId,
      workspaceId: "ws_regen_tail",
      modelId: "m",
      runtimeId: "enjoy-local",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "x" }]
    }
  } as never)
  const seen: Array<{ runId: string; messageId: string; role: string; sessionId: string }> = []
  L.setPersistedMessageSinkForTest((event) => seen.push(event))
  try {
    const run = L.getActiveRun(runId)!
    run.transcript.visible = "stub-ok hello"
    assert.equal(L.checkpointActiveRun(run), true)
    assert.equal(L.checkpointActiveRun(run), true)
    L.persistActiveRun(run, runId, "completed")
    assert.equal(seen.length, 1)
    assert.equal(seen[0]!.runId, runId)
    assert.equal(seen[0]!.sessionId, sessionId)
    assert.equal(seen[0]!.role, "assistant")
    assert.equal(seen[0]!.messageId, run.assistantMessageId)
    assert.deepEqual(remainingIds(sessionId), [run.assistantMessageId])
  } finally {
    L.setPersistedMessageSinkForTest(null)
    L.deleteActiveRun(runId)
  }
})
