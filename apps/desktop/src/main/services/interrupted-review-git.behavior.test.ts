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
import { writeTargetVerdict } from "./interrupted-review-git.ts"

const { getDatabase, persistMessage, queueInterruptedRunningSettle, recordRunStartHead, resetInterruptedRunningForTest } =
  await import(
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

function killedWriteRun(
  tag: string,
  root: string,
  opts: { target?: string; afterStart?: () => void; tool?: { name: string; args: unknown } } = {}
): string {
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
      tools: [{ id: "t1", name: opts.tool?.name ?? "write_file", state: "input-available", args: opts.tool ? opts.tool.args : { path: opts.target ?? "note.txt" }, result: { decision: "allow" } }]
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
  recordRunStartHead(runId, sessionId)
  opts.afterStart?.()
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

test("luna：强杀只读 bash ls / list_dir → 不进待验收（与写盘强杀语义对齐）", () => {
  const root = gitRepo(false)
  // 覆盖默认 write_file：改成 bash ls
  const sid = (() => {
    resetInterruptedRunningForTest()
    const sessionId = "ses_int_git_readonly_ls"
    const workspaceId = "ws_int_git_readonly_ls"
    const runId = "run_int_git_readonly_ls"
    const db = getDatabase()
    db.prepare(
      "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).run(workspaceId, "ws", root, 1, 1)
    db.prepare(
      "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).run(sessionId, workspaceId, "killed", 1, 1)
    persistMessage(sessionId, "user", "list files")
    persistMessage(
      sessionId,
      "assistant",
      serializeAssistantPayload({
        content: "",
        runId,
        tools: [{ id: "t1", name: "bash", state: "input-available", args: { command: "ls" }, result: { decision: "allow" } }]
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
    recordRunStartHead(runId, sessionId)
    queueInterruptedRunningSettle(getRun(db, runId)!)
    const row = db.prepare("SELECT workflow_status as w FROM sessions WHERE id = ?").get(sessionId) as { w: string | null }
    return row.w ?? ""
  })()
  assert.equal(sid, "in_progress")
})

test("leo：强杀 + 干净但这轮已 commit（HEAD 变了）：照旧待验收", () => {
  const root = gitRepo(false)
  const afterStart = () => {
    writeFileSync(join(root, "b.txt"), "b\n")
    execFileSync("git", ["-C", root, "add", "."], { stdio: "ignore" })
    execFileSync("git", ["-C", root, "commit", "-qm", "agent"], { stdio: "ignore" })
  }
  assert.equal(killedWriteRun("headmoved", root, { afterStart }), "needs_review")
})

test("leo：强杀 + 干净但写的是 gitignore 文件：照旧待验收", () => {
  const root = gitRepo(false)
  writeFileSync(join(root, ".gitignore"), "out/\n")
  execFileSync("git", ["-C", root, "add", "."], { stdio: "ignore" })
  execFileSync("git", ["-C", root, "commit", "-qm", "ignore"], { stdio: "ignore" })
  assert.equal(writeTargetVerdict(root, "out/x.txt"), "ignored")
  assert.equal(killedWriteRun("ignored", root, { target: "out/x.txt" }), "needs_review")
})

test("leo：强杀 + 干净但写到工作区外：照旧待验收", () => {
  assert.equal(killedWriteRun("outside", gitRepo(false), { target: "../elsewhere.txt" }), "needs_review")
  const root = gitRepo(false)
  assert.equal(writeTargetVerdict(root, "../elsewhere.txt"), "outside")
  assert.equal(writeTargetVerdict(root, "/tmp/elsewhere.txt"), "outside")
  assert.equal(writeTargetVerdict(root, "a.txt"), "visible")
  assert.equal(killedWriteRun("outside_abs", gitRepo(false), { target: "/tmp/elsewhere.txt" }), "needs_review")
})


test("leo fail-closed：强杀 + 干净但 bash 写到外部：照旧待验收", () => {
  const tool = { name: "bash", args: { command: "echo x > /tmp/leo-y.txt" } }
  assert.equal(killedWriteRun("bash_write", gitRepo(false), { tool }), "needs_review")
})

test("leo fail-closed：强杀 + 干净但 code_mode：照旧待验收", () => {
  const tool = { name: "code_mode", args: { code: "fs.writeFileSync('/tmp/z', 'x')" } }
  assert.equal(killedWriteRun("code_mode", gitRepo(false), { tool }), "needs_review")
})

test("leo fail-closed：强杀 + 干净但 apply_patch：照旧待验收", () => {
  const tool = { name: "apply_patch", args: { patch: "*** Begin Patch\n*** Add File: out/x.txt\n+x\n*** End Patch" } }
  assert.equal(killedWriteRun("apply_patch", gitRepo(false), { tool }), "needs_review")
})

test("leo fail-closed：强杀 + 干净但未知 MCP 工具：照旧待验收", () => {
  const tool = { name: "mcp_x__foo", args: { anything: 1 } }
  assert.equal(killedWriteRun("mcp_unknown", gitRepo(false), { tool }), "needs_review")
})

test("leo fail-closed：写文件工具缺路径：照旧待验收", () => {
  const tool = { name: "write_file", args: {} }
  assert.equal(killedWriteRun("nopath", gitRepo(false), { tool }), "needs_review")
})
