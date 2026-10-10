/**
 * 归档 deny 必须把助手信封里的审批中工具折成 output-denied。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { parseAssistantPayload, serializeAssistantPayload } from "@enjoy-agents/ipc-contract"
import { insertRun } from "@enjoy-agents/db"

const { getDatabase, persistMessage, foldDeniedAssistantTool, sessionIdForRun } = await import(
  "./fold-denied-assistant-tools.test-load.ts"
)

function seedSession(sessionId: string, runId: string) {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_fold_deny", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, "ws_fold_deny", "fold", 1, 1)
  try {
    insertRun(db, {
      id: runId,
      sessionId,
      workspaceId: "ws_fold_deny",
      kind: "agent",
      status: "waiting_review",
      modelId: "m",
      providerId: null,
      checkpoint: null,
      error: null
    })
  } catch {
    // 同行已在
  }
}

test("归档 deny 后助手工具从 approval-requested 变成 output-denied", () => {
  const sessionId = "ses_fold_deny"
  const runId = "run_fold_deny"
  seedSession(sessionId, runId)
  const content = serializeAssistantPayload({
    content: "",
    tools: [
      {
        id: "tool_archive",
        name: "write_file",
        state: "approval-requested",
        args: { path: "note.txt", content: "x" }
      }
    ]
  })
  persistMessage(sessionId, "assistant", content)
  assert.equal(sessionIdForRun(runId), sessionId)
  assert.equal(
    foldDeniedAssistantTool({ sessionId, runId, toolCallId: "tool_archive" }),
    true
  )
  const row = getDatabase()
    .prepare("SELECT content FROM messages WHERE session_id = ? AND role = 'assistant'")
    .get(sessionId) as { content: string }
  const payload = parseAssistantPayload(row.content)
  assert.equal(payload.tools?.[0]?.state, "output-denied")
  assert.equal(
    (payload.tools?.[0]?.result as { decision?: string } | undefined)?.decision,
    "deny"
  )
})
