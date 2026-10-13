/**
 * jojo P2（main-150 巡检）：开泵前失败（附件需视觉模型 / 读不到附件）必须把 run 落成 failed + error。
 * 之前库里一直 running：「重新生成」被拒（还在运行），重启后红卡 / lastError 全没。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"

const L = await import("./session-truncate.behavior.load.ts")
const { applyExplicitSessionTruncate, getDatabase, holdAgentRun, insertRun, getActiveRun } = L
const { failRunBeforePump } = await import("./agent-run-prepare-fail.ts")
const { sessionLastError } = await import("./session-last-error.ts")

const sent: Array<{ type?: string }> = []
const fakeWindow = () =>
  ({
    isDestroyed: () => false,
    webContents: { isDestroyed: () => false, send: (_c: string, e: { type?: string }) => void sent.push(e) }
  }) as unknown as BrowserWindow

test("开泵前抛错：runs 落 failed + error，活 run 撤掉；可截断重跑；重启读库仍有红卡", async () => {
  const db = getDatabase()
  const sessionId = "ses_prep_fail"
  const runId = "run_prep_fail"
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_prep_fail", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, "ws_prep_fail", "p", 1, 1)
  db.prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
    "u_prep_fail",
    sessionId,
    "user",
    "第二张图",
    1
  )
  insertRun(db, {
    id: runId,
    sessionId,
    workspaceId: "ws_prep_fail",
    kind: "agent",
    status: "running",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  holdAgentRun({
    runId,
    window: fakeWindow(),
    workspaceRoot: "/tmp",
    messages: [{ role: "user", content: "第二张图" }],
    input: {
      sessionId,
      workspaceId: "ws_prep_fail",
      modelId: "m",
      mode: "agent",
      attachments: ["asset_missing_for_prep_fail"],
      messages: [{ role: "user", content: "第二张图" }]
    }
  })
  await failRunBeforePump(runId, new Error("model_needs_vision"))
  const row = db.prepare("SELECT status, error FROM runs WHERE id = ?").get(runId) as { status: string; error: string | null }
  assert.equal(row.status, "failed")
  assert.ok(row.error && row.error.length > 0)
  assert.equal(getActiveRun(runId), undefined)
  assert.ok(sent.some((e) => e.type === "run.error"))
  // 不再被当活 run：重新生成可截断。
  const cut = applyExplicitSessionTruncate({ sessionId, afterMessageId: "u_prep_fail", expectedTailIds: [], reason: "regenerate" })
  assert.equal(cut.ok, true)
  // 重启（只读库）：红卡还在。
  assert.equal(sessionLastError(sessionId)?.runId, runId)
  assert.match(sessionLastError(sessionId)?.message ?? "", /^model_needs_vision$/)
})

test("接线：prepareAndPump 的 catch 走 failRunBeforePump（不再只发 run.error 不落库）", async () => {
  const { readFileSync } = await import("node:fs")
  const src = readFileSync(new URL("./agent-run-prepare.ts", import.meta.url), "utf8")
  assert.match(src, /\} catch \(error\) \{\s*await failRunBeforePump\(runId, error\)\s*\}/)
})
