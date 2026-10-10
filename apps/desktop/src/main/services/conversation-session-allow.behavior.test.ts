/**
 * 归档 / 永久删除必须清本会话允许表，下一轮重新问。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import type { BrowserWindow } from "electron"

const {
  archiveSession,
  clearAllConversationSessionAllows,
  deleteActiveRun,
  getDatabase,
  grantConversationToolAllow,
  holdAgentRun,
  getActiveRun,
  snapshotConversationSessionAllow
} = await import("./conversation-session-allow.behavior.load.ts")

function fakeWindow(): BrowserWindow {
  return { isDestroyed: () => false, webContents: { send() {} } } as unknown as BrowserWindow
}

function seedSession(sessionId: string): void {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_session_allow", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, "ws_session_allow", "session allow", 1, 1)
}

test.beforeEach(() => {
  clearAllConversationSessionAllows()
})

test("归档会话后本会话允许表清空，新 run 不再种子 write_file", async () => {
  const sessionId = "ses_allow_archive"
  seedSession(sessionId)
  grantConversationToolAllow(sessionId, "write_file")
  assert.equal(snapshotConversationSessionAllow(sessionId).toolNames.has("write_file"), true)
  await archiveSession(sessionId)
  assert.equal(snapshotConversationSessionAllow(sessionId).toolNames.has("write_file"), false)
  const runId = "run_after_archive_allow"
  holdAgentRun({
    runId,
    window: fakeWindow(),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId,
      workspaceId: "ws_session_allow",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "write" }]
    }
  })
  const run = getActiveRun(runId)
  assert.ok(run)
  assert.equal(run.sessionApprovedTools.has("write_file"), false)
  deleteActiveRun(runId)
})

test("永久删除与归档走同一 forget，清 desktop 表和写盘/bash 表", () => {
  const src = readFileSync(new URL("./session-lifecycle.ts", import.meta.url), "utf8")
  assert.match(src, /forgetConversationDesktopAllow\(sessionId\)/)
  assert.equal((src.match(/forgetConversationDesktopAllow\(sessionId\)/g) ?? []).length, 2)
  assert.match(
    src,
    /function forgetConversationDesktopAllow[\s\S]*clearConversationDesktopAllow\(sessionId\)[\s\S]*clearConversationSessionAllow\(sessionId\)/
  )
})
