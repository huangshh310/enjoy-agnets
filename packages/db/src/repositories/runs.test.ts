import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import { test } from "node:test"
import { applyMigrations } from "../migrations/runner.ts"
import {
  abandonRunningRuns,
  getRun,
  insertRun,
  insertRunStep,
  listRunSteps,
  updateRunStepChildRunId
} from "./runs.ts"

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

test("run_steps 支持 childRunId 插入、读取与更新", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  insertRun(db, {
    id: "run_parent",
    sessionId: "ses_p",
    workspaceId: null,
    kind: "workflow",
    status: "running",
    modelId: null,
    providerId: null,
    checkpoint: null,
    error: null
  })
  insertRunStep(db, {
    id: "step_1",
    runId: "run_parent",
    idx: 0,
    label: "子工作流执行",
    status: "running",
    childRunId: "run_child_1"
  })
  const steps = listRunSteps(db, "run_parent")
  assert.equal(steps.length, 1)
  assert.equal(steps[0].childRunId, "run_child_1")

  updateRunStepChildRunId(db, "step_1", "run_child_2")
  const updatedSteps = listRunSteps(db, "run_parent")
  assert.equal(updatedSteps[0].childRunId, "run_child_2")
})

