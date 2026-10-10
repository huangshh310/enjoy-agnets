/**
 * 本轮写盘被拒绝、没有任何工具真正执行：不算改动、不进待验收、不弹已完成。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { lastTurnDeniedOnly, pathsFromLastTurn } from "../components/ai-chat/right-pane/views/review/last-turn-paths.ts"
import { describeReviewFiles } from "../components/ai-chat/composer/session-review/collect-session-files.ts"
import { workflowAfterStreamEvent } from "../components/ai-chat/review-gate/review-gate-phase.ts"
import { ingestAttentionEvent } from "../stores/attention/ingest-attention.ts"
import type { ThreadMessage } from "../stores/chat-store.types.ts"

function msg(partial: Partial<ThreadMessage> & Pick<ThreadMessage, "role" | "content">): ThreadMessage {
  return {
    id: partial.id ?? "m",
    createdAt: 1,
    ...partial
  }
}

const deniedTurn: ThreadMessage[] = [
  msg({ role: "user", content: "write a note" }),
  msg({
    role: "assistant",
    content: "",
    tools: [
      {
        id: "tool_1",
        name: "write_file",
        args: { path: "e2e-stub.txt", content: "from stub" },
        state: "output-denied",
        errorText: "已拒绝，本次未执行"
      }
    ]
  })
]

test("拒绝写盘：无本轮改动，磁盘残留也不算本轮", () => {
  assert.equal(lastTurnDeniedOnly(deniedTurn), true)
  assert.deepEqual(pathsFromLastTurn(deniedTurn), [])
  const pick = describeReviewFiles(
    pathsFromLastTurn(deniedTurn),
    [{ path: "e2e-stub.txt", status: "untracked", additions: 1, deletions: 0 }],
    false
  )
  assert.equal(pick.fromLastTurn, false)
})

test("拒绝写盘：run.end 回待办，不进待验收，不弹已完成", () => {
  assert.equal(workflowAfterStreamEvent("run.end", { deniedOnly: true }), "todo")
  assert.equal(workflowAfterStreamEvent("run.end"), "needs_review")
  const items = ingestAttentionEvent([], {
    event: { type: "run.end", runId: "run_1" },
    sessionId: "ses_1",
    sessionTitle: "新对话",
    now: 2,
    omitComplete: true
  })
  assert.equal(
    items.some((item) => item.kind === "complete" && item.status === "active"),
    false
  )
})
