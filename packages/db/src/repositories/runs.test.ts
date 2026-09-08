import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import { test } from "node:test"
import { applyMigrations } from "../migrations/runner.ts"
import { abandonRunningRuns, getRun, insertRun } from "./runs.ts"

test("abandonRunningRuns 只把 running 标成 cancelled，不动 completed", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  insertRun(db, {
    id: "run_live",
    sessionId: "ses_1",
    workspaceId: null,
    kind: "agent",
    status: "running",
    modelId: "grok-4.6",
    providerId: null,
    checkpoint: null,
    error: null
  })
  insertRun(db, {
    id: "run_done",
    sessionId: "ses_1",
    workspaceId: null,
    kind: "agent",
    status: "completed",
    modelId: "grok-4.6",
    providerId: null,
    checkpoint: null,
    error: null
  })
  assert.equal(abandonRunningRuns(db), 1)
  assert.equal(getRun(db, "run_live")?.status, "cancelled")
  assert.equal(getRun(db, "run_done")?.status, "completed")
})
