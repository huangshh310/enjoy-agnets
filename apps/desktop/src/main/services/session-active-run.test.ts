/**
 * 回灌只问该会话自己的 ActiveRun。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"
import { deleteActiveRun, holdAgentRun } from "./agent-run-state.ts"
import { sessionActiveRun } from "./session-active-run.ts"

test("只回报该 sessionId 的活泵", () => {
  const runId = "run_ses_active"
  holdAgentRun({
    runId,
    window: { isDestroyed: () => false, webContents: { send() {} } } as unknown as BrowserWindow,
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId: "ses_active",
      workspaceId: "ws_active",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "hi" }]
    }
  })
  assert.deepEqual(sessionActiveRun("ses_active"), { runId, running: true })
  assert.deepEqual(sessionActiveRun("ses_other"), { runId: null, running: false })
  deleteActiveRun(runId)
})
