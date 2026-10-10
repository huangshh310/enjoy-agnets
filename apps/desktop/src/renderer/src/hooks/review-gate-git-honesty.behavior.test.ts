/**
 * 待验收 / 打回通过横幅只看本轮已执行写盘，不看工作区 git 脏状态。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { decideTurnOutcome } from "@enjoy-agents/ipc-contract/turn-outcome"
import { acceptStreamEvent } from "../../../main/services/accept-stream-event.ts"
import { ingestAttentionEvent } from "../stores/attention/ingest-attention.ts"
import { describeReviewFiles } from "../components/ai-chat/composer/session-review/collect-session-files.ts"
import { sessionReviewVisible } from "../components/ai-chat/composer/session-review/session-review-visible.ts"
import { reviewGatePhase, workflowAfterStreamEvent } from "../components/ai-chat/review-gate/review-gate-phase.ts"

const dirtyWorkspace = Array.from({ length: 37 }, (_, index) => ({
  path: `preexisting-${index}.txt`,
  status: "untracked" as const,
  additions: 1,
  deletions: 0
}))

test("只读 hello + 工作区已有未提交：不进待验收，打回通过横幅不出现", () => {
  const turn = decideTurnOutcome({ ended: "end", tools: [] })
  const workflow = workflowAfterStreamEvent("run.end", { turn })
  const pick = describeReviewFiles([], dirtyWorkspace, false)
  const showReview = sessionReviewVisible(
    pick.files.length,
    false,
    undefined,
    undefined,
    2,
    workflow === "needs_review"
  )
  assert.equal(workflow, "todo")
  assert.equal(reviewGatePhase({ running: false, workflowStatus: workflow }), null)
  assert.deepEqual(pick.files, [])
  assert.equal(showReview, false)
})

test("写盘轮打回通过横幅只数本轮文件，不数整仓未提交", () => {
  const turn = decideTurnOutcome({
    ended: "end",
    tools: [{ name: "write_file", state: "output-available" }]
  })
  const pick = describeReviewFiles(
    ["e2e-stub.txt"],
    [
      { path: "e2e-stub.txt", status: "untracked", additions: 1, deletions: 0 },
      ...dirtyWorkspace
    ],
    false
  )
  assert.equal(turn.workflow, "needs_review")
  assert.deepEqual(
    pick.files.map((file) => file.path),
    ["e2e-stub.txt"]
  )
  assert.equal(pick.files.length, 1)
})

test("approval.required 缺 args：出站闸放行并占审批槽", () => {
  const accepted = acceptStreamEvent({
    type: "approval.required",
    runId: "run_hang",
    toolCallId: "tool_hang",
    approvalId: "apr_hang",
    name: "write_file"
  })
  assert.ok(accepted)
  const items = ingestAttentionEvent([], {
    event: accepted,
    sessionId: "ses_hang",
    sessionTitle: "ses_hang",
    now: 1
  })
  assert.equal(items.find((item) => item.kind === "pending_approval")?.status, "active")
})
