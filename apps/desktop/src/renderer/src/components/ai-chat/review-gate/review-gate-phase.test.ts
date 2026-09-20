import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { reviewGatePhase, runNeedsHumanReview } from "./review-gate-phase.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("运行中盖过待验收 / 完成", () => {
  assert.equal(reviewGatePhase({ running: true, workflowStatus: "needs_review" }), "running")
  assert.equal(reviewGatePhase({ running: true, workflowStatus: "done" }), "running")
})

test("停泵后按 workflowStatus 进人闸或完成", () => {
  assert.equal(reviewGatePhase({ running: false, workflowStatus: "needs_review" }), "needs_review")
  assert.equal(reviewGatePhase({ running: false, workflowStatus: "done" }), "done")
})

test("todo / in_progress / 空不画顶栏铬", () => {
  assert.equal(reviewGatePhase({ running: false, workflowStatus: "todo" }), null)
  assert.equal(reviewGatePhase({ running: false, workflowStatus: "in_progress" }), null)
  assert.equal(reviewGatePhase({ running: false, workflowStatus: null }), null)
})

test("只有真实写盘 path 才需要人验收", () => {
  assert.equal(runNeedsHumanReview(["preview/index.html"]), true)
  assert.equal(runNeedsHumanReview(["  "]), false)
  assert.equal(runNeedsHumanReview([]), false)
})

test("打回 / 通过不调用 git commit 或 push", () => {
  const actions = readFileSync(join(dir, "review-gate-actions.ts"), "utf8")
  assert.ok(actions.includes("in_progress"))
  assert.ok(actions.includes('"done"'))
  assert.ok(!actions.includes("gitCommit"))
  assert.ok(!actions.includes("git_commit"))
  assert.ok(!actions.includes("gitPush"))
  assert.ok(!actions.includes("git_push"))
})
