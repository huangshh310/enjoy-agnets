/**
 * leo BLOCK：强杀重启后「N 项」不能少报成 0。
 * 真走恢复路径：写盘 run → 强杀（run 仍 running）→ queueInterruptedRunningSettle → session.changes = 1。
 */
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { getRun, insertRun } from "@enjoy-agents/db"
import { serializeAssistantPayload } from "@enjoy-agents/ipc-contract"

const { getDatabase, persistMessage, queueInterruptedRunningSettle } = await import(
  "./restore-interrupted-running.behavior.load.ts"
)
const { recordRunStartDirty, sessionChanges, sessionHasWritingRuns } = await import("./session-changes.ts")

function repo(): string {
  const root = mkdtempSync(join(tmpdir(), "enjoy-scr-"))
  const git = (...args: string[]) => execFileSync("git", ["-C", root, ...args], { stdio: "pipe" })
  git("init", "-q")
  writeFileSync(join(root, "readme.md"), "# r\n")
  git("add", ".")
  git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "init")
  writeFileSync(join(root, "e2e-stub.txt"), "pre-existing\n")
  return root
}

function seed(tag: string, root: string): string {
  const db = getDatabase()
  db.prepare("INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(
    `ws_scr_${tag}`, "ws", root, 1, 1
  )
  const sid = `ses_scr_${tag}`
  db.prepare("INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(
    sid, `ws_scr_${tag}`, "t", 1, 1
  )
  return sid
}

const toolParts = (sid: string) =>
  (getDatabase()
    .prepare("SELECT COUNT(*) n FROM message_parts p JOIN messages m ON m.id = p.message_id WHERE m.session_id = ? AND p.type = 'tool'")
    .get(sid) as { n: number }).n

test("写盘 run → 强杀 → 恢复：tool parts 保留，会话改动 = 1", () => {
  const root = repo()
  const sid = seed("kill", root)
  const runId = "run_scr_kill"
  const db = getDatabase()
  insertRun(db, { id: runId, sessionId: sid, workspaceId: `ws_scr_kill`, kind: "agent", status: "running", modelId: "m", providerId: null, checkpoint: null, error: null })
  recordRunStartDirty(runId, sid)
  persistMessage(sid, "user", "please write a.txt")
  const tool = { id: "t_w", name: "write_file", state: "output-available", args: { path: "a.txt" }, result: { ok: true } }
  persistMessage(sid, "assistant", serializeAssistantPayload({ content: "one two", runId, tools: [tool] }), [
    { type: "tool", toolCallId: "t_w", name: "write_file", args: { path: "a.txt" }, state: "output-available" },
    { type: "text", text: "one two" }
  ] as never)
  writeFileSync(join(root, "a.txt"), "written before kill\n")
  assert.equal(toolParts(sid), 1)
  queueInterruptedRunningSettle(getRun(db, runId)!)
  assert.equal(toolParts(sid), 1, "恢复重写助手行不能删掉 tool parts")
  const r = sessionChanges(sid)
  assert.equal(r.baseline, "known")
  assert.deepEqual(r.paths, ["a.txt"])
  assert.equal(r.sessionChangeCount, 1)
})

test("只剩正文信封里的 tools（没有 tool parts）也算写盘 run", () => {
  const root = repo()
  const sid = seed("envelope", root)
  persistMessage(
    sid,
    "assistant",
    serializeAssistantPayload({ content: "x", tools: [{ id: "t", name: "write_file", state: "output-available", args: { path: "a.txt" } }] }),
    [{ type: "text", text: "x" }] as never
  )
  assert.equal(toolParts(sid), 0)
  assert.equal(sessionHasWritingRuns(sid), true)
})

test("R14：读不懂的工具记录当写过（fail-closed）", () => {
  const root = repo()
  const sid = seed("garbled", root)
  const mid = persistMessage(sid, "assistant", "plain", [{ type: "text", text: "plain" }] as never)
  getDatabase()
    .prepare("INSERT INTO message_parts (id, message_id, idx, type, payload, created_at) VALUES (?, ?, ?, 'tool', ?, ?)")
    .run("prt_garbled", mid, 9, "{not json", 1)
  assert.equal(sessionHasWritingRuns(sid), true)
  const sid2 = seed("noname", root)
  persistMessage(sid2, "assistant", "plain", [{ type: "tool", toolCallId: "x", name: "" }] as never)
  assert.equal(sessionHasWritingRuns(sid2), true)
})
