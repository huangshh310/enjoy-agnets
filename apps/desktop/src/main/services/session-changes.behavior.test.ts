/**
 * luna P2：会话级改动只算本会话写盘 run 自基线以来改过的文件；跑前已脏、没被改的不算。
 */
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"

const { getDatabase, persistMessage } = await import("./restore-interrupted-running.behavior.load.ts")
const { recordRunStartDirty, sessionChanges } = await import("./session-changes.ts")

function repo(): string {
  const root = mkdtempSync(join(tmpdir(), "enjoy-sc-"))
  const git = (...args: string[]) => execFileSync("git", ["-C", root, ...args], { stdio: "pipe" })
  git("init", "-q")
  git("config", "user.email", "t@t")
  git("config", "user.name", "t")
  writeFileSync(join(root, "b.txt"), "base\n")
  git("add", ".")
  git("commit", "-qm", "init")
  // 跑前就脏：已跟踪改动 + 未跟踪文件
  writeFileSync(join(root, "b.txt"), "dirty before\n")
  writeFileSync(join(root, "e2e-stub.txt"), "pre-existing\n")
  return root
}

function session(tag: string, root: string): string {
  const db = getDatabase()
  db.prepare("INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(
    `ws_sc_${tag}`,
    "ws",
    root,
    1,
    1
  )
  const sid = `ses_sc_${tag}`
  db.prepare("INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(
    sid,
    `ws_sc_${tag}`,
    "t",
    1,
    1
  )
  return sid
}

function toolTurn(sid: string, name: string, args: unknown): void {
  persistMessage(sid, "user", "go")
  persistMessage(sid, "assistant", "ok", [
    { type: "tool", toolCallId: `tc_${sid}_${name}`, name, args, state: "output-available" },
    { type: "text", text: "ok" }
  ] as never)
}

test("脏工作区 + 只跑 ls 的新会话 = 0（不归 e2e-stub.txt / b.txt）", () => {
  const root = repo()
  const sid = session("ls", root)
  recordRunStartDirty("run_sc_ls", sid)
  toolTurn(sid, "bash", { command: "ls" })
  const r = sessionChanges(sid)
  assert.equal(r.hasWritingRuns, false)
  assert.equal(r.baseline, "none")
  assert.equal(r.sessionChangeCount, 0)
  assert.deepEqual(r.paths, [])
})

test("没有任何 run 的空会话 = 0", () => {
  const root = repo()
  const sid = session("empty", root)
  assert.equal(sessionChanges(sid).sessionChangeCount, 0)
})

test("会话写 a.txt，跑前已脏 b.txt / e2e-stub.txt 不算 → 1", () => {
  const root = repo()
  const sid = session("write", root)
  recordRunStartDirty("run_sc_write", sid)
  writeFileSync(join(root, "a.txt"), "new\n")
  toolTurn(sid, "write_file", { path: "a.txt", content: "new\n" })
  const r = sessionChanges(sid)
  assert.equal(r.baseline, "known")
  assert.deepEqual(r.paths, ["a.txt"])
  assert.equal(r.sessionChangeCount, 1)
})

test("会话又改了跑前已脏的 b.txt → 计入", () => {
  const root = repo()
  const sid = session("touchb", root)
  recordRunStartDirty("run_sc_touchb", sid)
  writeFileSync(join(root, "b.txt"), "changed by session\n")
  toolTurn(sid, "edit_file", { path: "b.txt" })
  assert.deepEqual(sessionChanges(sid).paths, ["b.txt"])
})

test("fail-closed：有写盘 run 但没基线（老 run）→ unknown，不归零也不乱算", () => {
  const root = repo()
  const sid = session("nobase", root)
  toolTurn(sid, "write_file", { path: "a.txt" })
  const r = sessionChanges(sid)
  assert.equal(r.baseline, "unknown")
  assert.equal(r.hasWritingRuns, true)
})

test("git 出错 → 有写盘 run 的 unknown；没写盘 run 的仍是 0", () => {
  const root = repo()
  const w = session("gitfail_w", root)
  recordRunStartDirty("run_sc_gfw", w)
  toolTurn(w, "write_file", { path: "a.txt" })
  assert.equal(sessionChanges(w, () => null).baseline, "unknown")
  const ro = session("gitfail_ro", root)
  toolTurn(ro, "bash", { command: "ls" })
  const r = sessionChanges(ro, () => null)
  assert.equal(r.sessionChangeCount, 0)
  assert.equal(r.baseline, "none")
})
