/**
 * Stop 中途写盘后，非 git / git 会话都进 Inbox 待验收。只认落库 workflow_status。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"
import { insertRun, listSessionsNeedingReview } from "@enjoy-agents/db"

const { deleteActiveRun, getActiveRun, holdAgentRun, getDatabase, abortActiveRunMemory } =
  await import("./settle-run-approvals.behavior.load.ts")

function silentWindow(): BrowserWindow {
  return {
    isDestroyed: () => false,
    webContents: { send() {} }
  } as unknown as BrowserWindow
}

function seedWorkspace(workspaceId: string, rootPath: string): void {
  getDatabase()
    .prepare(
      "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(workspaceId, workspaceId, rootPath, 1, 1)
}

function seedSession(sessionId: string, workspaceId: string, runId: string): void {
  getDatabase()
    .prepare(
      "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(sessionId, workspaceId, sessionId, 1, 1)
  insertRun(getDatabase(), {
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
}

function stopAfterWrite(input: {
  runId: string
  sessionId: string
  workspaceId: string
  workspaceRoot: string
}): void {
  holdAgentRun({
    runId: input.runId,
    window: silentWindow(),
    workspaceRoot: input.workspaceRoot,
    messages: [],
    input: {
      sessionId: input.sessionId,
      workspaceId: input.workspaceId,
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "write" }]
    }
  })
  const run = getActiveRun(input.runId)
  if (!run) throw new Error("hold failed")
  run.tools = [
    {
      id: "tool_write",
      name: "write_file",
      state: "output-available",
      args: { path: "note.txt", content: "x" }
    }
  ]
  abortActiveRunMemory(input.runId)
  deleteActiveRun(input.runId)
}

test("非 git 与 git 仓中途停下后 Inbox 待验收都有行", () => {
  seedWorkspace("ws_plain", "/tmp/plain-no-git")
  seedWorkspace("ws_git", "/tmp/repo-with-git")
  seedSession("ses_plain_stop", "ws_plain", "run_plain_stop")
  seedSession("ses_git_stop", "ws_git", "run_git_stop")
  stopAfterWrite({
    runId: "run_plain_stop",
    sessionId: "ses_plain_stop",
    workspaceId: "ws_plain",
    workspaceRoot: "/tmp/plain-no-git"
  })
  stopAfterWrite({
    runId: "run_git_stop",
    sessionId: "ses_git_stop",
    workspaceId: "ws_git",
    workspaceRoot: "/tmp/repo-with-git"
  })
  const items = listSessionsNeedingReview(getDatabase())
  assert.ok(items.some((item) => item.id === "ses_plain_stop" && item.workflowStatus === "needs_review"))
  assert.ok(items.some((item) => item.id === "ses_git_stop" && item.workflowStatus === "needs_review"))
})
