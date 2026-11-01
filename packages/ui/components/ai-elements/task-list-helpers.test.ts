/**
 * 任务坞诚实态计数。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { dockHonestyCounts } from "./task-list-honesty.ts"
import type { NormalizedTask } from "./task-list.types.ts"

const rows: NormalizedTask[] = [
  { title: "a", status: "completed" },
  { title: "b", status: "failed" },
  { title: "c", status: "cancelled" },
  { title: "d", status: "in_progress" },
  { title: "e", status: "pending" }
]

test("dockHonestyCounts：live=false 时 in_progress 计入已停止", () => {
  assert.deepEqual(dockHonestyCounts(rows, false), { failed: 1, stopped: 2 })
  assert.deepEqual(dockHonestyCounts(rows, true), { failed: 1, stopped: 1 })
})
