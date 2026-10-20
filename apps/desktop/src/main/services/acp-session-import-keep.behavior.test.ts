/**
 * luna g157b（-76 → -66）：从本机助手导入的会话在 Enjoy 里没有消息，但不是空「新对话」——
 * 离开时（onlyIfEmpty）和重启时（pruneEmptySessions）都不能删；切引擎清掉 ACP 绑定后也不能删。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const { getDatabase } = await import("./restore-interrupted-running.behavior.load.ts")
const { pruneEmptySessions, deleteSession } = await import("./session-lifecycle.ts")
const { createImportedAcpSession: importAcpSession } = await import("./acp-session-import-create.ts")
const { clearAcpSessionBind } = await import("./acp-session-bind.ts")

function workspace(): string {
  getDatabase()
    .prepare("INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
    .run("ws_acp_keep", "ws", "/tmp", 1, 1)
  return "ws_acp_keep"
}

const exists = (sid: string) => Boolean(getDatabase().prepare("SELECT 1 FROM sessions WHERE id = ?").get(sid))

test("导入的 ACP 会话（0 条消息）：离开时 onlyIfEmpty 不删、重启清空壳也不删", async () => {
  const ws = workspace()
  const created = await importAcpSession({ runtimeId: "amp", workspaceId: ws, acpSessionId: "acp_keep_1", title: "本机助手的旧会话" })
  assert.equal(deleteSession(created.id, { onlyIfEmpty: true }).deleted, false, "离开时不删")
  pruneEmptySessions()
  assert.equal(exists(created.id), true, "重启清空壳后还在侧栏")
  const row = getDatabase().prepare("SELECT imported_from FROM sessions WHERE id = ?").get(created.id) as { imported_from: string }
  assert.equal(row.imported_from, "amp", "来源标记落库")
})

test("导入的会话切过引擎（ACP 绑定被清）：仍按导入的会话保留", async () => {
  const ws = workspace()
  const created = await importAcpSession({ runtimeId: "amp", workspaceId: ws, acpSessionId: "acp_keep_2", title: "切过引擎" })
  clearAcpSessionBind(created.id)
  pruneEmptySessions()
  assert.equal(exists(created.id), true)
  assert.equal(deleteSession(created.id, { onlyIfEmpty: true }).deleted, false)
})

test("对照：普通空「新对话」照旧删（标记不误伤清理）", () => {
  const ws = workspace()
  getDatabase()
    .prepare("INSERT INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
    .run("ses_acp_keep_plain", ws, "新对话", 1, 1)
  pruneEmptySessions()
  assert.equal(exists("ses_acp_keep_plain"), false)
})

// 接线：importAcpSession（加载 agent-harness，单测载不动）必须经 createImportedAcpSession 建会话（来源标记在那里写）。
test("接线：importAcpSession 走 createImportedAcpSession", async () => {
  const { readFileSync } = await import("node:fs")
  const src = readFileSync(new URL("./acp-session-import.ts", import.meta.url), "utf8")
  const body = src.slice(src.indexOf("export async function importAcpSession"))
  assert.match(body, /const created = await createImportedAcpSession\(input\)/)
  assert.ok(!/createSession\(/.test(src), "不能绕过 createImportedAcpSession 自己建会话")
})
