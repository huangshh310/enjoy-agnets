/**
 * luna P2：「从这里重来」只改聊天后，待验收（needs_review）按剩下的轮次重算，main 为准。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const { applyExplicitSessionTruncate, getDatabase, persistFinishedAssistant, persistUserTurn } = await import(
  "./regenerate-tail.behavior.load.ts"
)

const tick = () => new Promise((resolve) => setTimeout(resolve, 3))

function seed(sessionId: string, workflow: string | null) {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_review_trunc", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at, workflow_status) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(sessionId, "ws_review_trunc", "review", 1, 1, workflow)
}

function workflow(sessionId: string): string | null {
  return (
    getDatabase().prepare("SELECT workflow_status as w FROM sessions WHERE id = ?").get(sessionId) as {
      w: string | null
    }
  ).w
}

type Tool = { id: string; name: string; state: string; args?: unknown; result?: unknown; errorText?: string }

async function turn(sessionId: string, userId: string, prompt: string, tools: Tool[]) {
  persistUserTurn(sessionId, prompt, [], userId)
  await tick()
  const id = persistFinishedAssistant({
    sessionId,
    content: "",
    reasoning: "",
    tools,
    startedAt: Date.now(),
    extras: {},
    runKind: "agent",
    runId: `${userId}_run`
  })
  assert.ok(id)
  await tick()
  return id
}

const denied = (name: string, args: unknown): Tool => ({
  id: `t_${name}_${Math.random()}`,
  name,
  state: "output-denied",
  args
})
const wrote: Tool = {
  id: "t_write",
  name: "write_file",
  state: "output-available",
  args: { path: "note.md" },
  result: { ok: true }
}

test("删掉的那轮才是待验收来源：剩下全是「已拒绝」→ 回 todo（审查条消失）", async () => {
  const sessionId = "ses_review_trunc_clear"
  seed(sessionId, "needs_review")
  await turn(sessionId, `${sessionId}_u1`, "please write a note", [denied("write_file", { path: "n.md" })])
  await turn(sessionId, `${sessionId}_u2`, "run bash ls", [denied("bash", { command: "ls" })])
  const u3 = `${sessionId}_u3`
  const a3 = await turn(sessionId, u3, "write it now", [wrote])
  const result = applyExplicitSessionTruncate({
    sessionId,
    fromMessageId: u3,
    expectedTailIds: [u3, a3],
    reason: "rewind"
  })
  assert.deepEqual(result, { ok: true, deleted: 2 })
  assert.equal(workflow(sessionId), "todo")
})

test("剩下的轮里还有真写过盘的：保持 needs_review（宁可多审）", async () => {
  const sessionId = "ses_review_trunc_keep"
  seed(sessionId, "needs_review")
  await turn(sessionId, `${sessionId}_u1`, "write", [wrote])
  const u2 = `${sessionId}_u2`
  const a2 = await turn(sessionId, u2, "again", [{ ...wrote, id: "t_write_2" }])
  applyExplicitSessionTruncate({ sessionId, fromMessageId: u2, expectedTailIds: [u2, a2], reason: "rewind" })
  assert.equal(workflow(sessionId), "needs_review")
})

test("剩下只有只读 bash（ls）：也回 todo（P3 同一判定）", async () => {
  const sessionId = "ses_review_trunc_readonly"
  seed(sessionId, "needs_review")
  await turn(sessionId, `${sessionId}_u1`, "run bash ls", [
    { id: "t_ls", name: "bash", state: "output-available", args: { command: "ls" }, result: { stdout: "a" } }
  ])
  const u2 = `${sessionId}_u2`
  const a2 = await turn(sessionId, u2, "write", [wrote])
  applyExplicitSessionTruncate({ sessionId, fromMessageId: u2, expectedTailIds: [u2, a2], reason: "rewind" })
  assert.equal(workflow(sessionId), "todo")
})

test("没在待验收（in_progress / todo）不动；截断被拒（STALE）也不动", async () => {
  const sessionId = "ses_review_trunc_noop"
  seed(sessionId, "in_progress")
  const u1 = `${sessionId}_u1`
  const a1 = await turn(sessionId, u1, "write", [wrote])
  applyExplicitSessionTruncate({ sessionId, fromMessageId: u1, expectedTailIds: [u1, a1], reason: "rewind" })
  assert.equal(workflow(sessionId), "in_progress")

  const other = "ses_review_trunc_stale"
  seed(other, "needs_review")
  const v1 = `${other}_u1`
  await turn(other, v1, "write", [wrote])
  const stale = applyExplicitSessionTruncate({
    sessionId: other,
    fromMessageId: v1,
    expectedTailIds: [v1, "msg_pending_x"],
    reason: "rewind"
  })
  assert.equal(stale.ok, false)
  assert.equal(workflow(other), "needs_review")
})
