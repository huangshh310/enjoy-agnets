/**
 * luna（#145 后续 B）：强杀后 git 确认没改 → 不进待验收；有改动 / 非 git → 照旧待验收。
 */
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { insertRun, getRun } from "@enjoy-agents/db"
import { serializeAssistantPayload } from "@enjoy-agents/ipc-contract"

const { getDatabase, persistMessage, queueInterruptedRunningSettle, resetInterruptedRunningForTest } = await import(
  "./restore-interrupted-running.behavior.load.ts"
)

function gitRepo(dirty: boolean): string {
  const root = mkdtempSync(join(tmpdir(), "enjoy-int-git-"))
  const git = (...args: string[]) => execFileSync("git", ["-C", root, ...args], { stdio: "ignore" })
  git("init", "-q")
  git("config", "user.email", "t@t")
  git("config", "user.name", "t")
  writeFileSync(join(root, "a.txt"), "a\n")
  git("add", ".")
  git("commit", "-qm", "init")
  if (dirty) writeFileSync(join(root, "a.txt"), "changed\n")
  return root
}

function killedWriteRun(tag: string, root: string): string {
  resetInterruptedRunningForTest()
  const sessionId = `ses_int_git_${tag}`
  const workspaceId = `ws_int_git_${tag}`
  const runId = `run_int_git_${tag}`
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(workspaceId, "ws", root, 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, workspaceId, "killed", 1, 1)
  persistMessage(sessionId, "user", "please write")
  persistMessage(
    sessionId,
    "assistant",
    serializeAssistantPayload({
      content: "",
      runId,
      tools: [{ id: "t1", name: "write_file", state: "input-available", args: { path: "note.txt" }, result: { decision: "allow" } }]
    })
  )
  insertRun(db, {
    id: runId,
    sessionId,
    workspaceId,
    kind: "agent",
    status: "running",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  queueInterruptedRunningSettle(getRun(db, runId)!)
  const row = db.prepare("SELECT workflow_status as w FROM sessions WHERE id = ?").get(sessionId) as { w: string | null }
  return row.w ?? ""
}

test("强杀 + git 确认干净：不进待验收", () => {
  assert.equal(killedWriteRun("clean", gitRepo(false)), "in_progress")
})

test("强杀 + git 有改动：照旧待验收", () => {
  assert.equal(killedWriteRun("dirty", gitRepo(true)), "needs_review")
})

test("强杀 + 非 git 目录：未确认，照旧待验收", () => {
  assert.equal(killedWriteRun("nogit", mkdtempSync(join(tmpdir(), "enjoy-int-nogit-"))), "needs_review")
})
