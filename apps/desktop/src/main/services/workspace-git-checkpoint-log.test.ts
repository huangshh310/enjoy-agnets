import assert from "node:assert/strict"
import { test } from "node:test"
import {
  CHECKPOINT_LOG_WINDOW_MS,
  CHECKPOINT_STDERR_CAP,
  capCheckpointStderr,
  logCheckpointFailure,
  resetCheckpointFailureLog
} from "./workspace-git-checkpoint-log.ts"

test("stderr 截到 ~2KB 并标明截断", () => {
  assert.equal(capCheckpointStderr("  short\n"), "short")
  const capped = capCheckpointStderr("x".repeat(CHECKPOINT_STDERR_CAP + 500))
  assert.ok(capped.startsWith("x".repeat(CHECKPOINT_STDERR_CAP)))
  assert.ok(capped.length < CHECKPOINT_STDERR_CAP + 40)
  assert.match(capped, /truncated 500 chars/)
})

test("日志里的 stderr 已截断；同 key 窗口内限流，过窗口或换步骤再记", (t) => {
  resetCheckpointFailureLog()
  const logged: unknown[][] = []
  t.mock.method(console, "error", (...args: unknown[]) => {
    logged.push(args)
  })
  const base = { workspaceRoot: "/w", step: "commit-tree", stderr: "e".repeat(10_000) }
  assert.equal(logCheckpointFailure(base, 1_000), true)
  const detail = logged[0]?.[1] as { stderr: string; step: string }
  assert.ok(detail.stderr.length < CHECKPOINT_STDERR_CAP + 40)
  assert.equal(logCheckpointFailure(base, 2_000), false)
  assert.equal(logCheckpointFailure({ ...base, step: "update-ref" }, 2_000), true)
  assert.equal(logCheckpointFailure(base, 1_000 + CHECKPOINT_LOG_WINDOW_MS), true)
  assert.equal(logged.length, 3)
  resetCheckpointFailureLog()
})
