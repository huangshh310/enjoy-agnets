import assert from "node:assert/strict"
import { test } from "node:test"
import {
  TOOL_BOUNDARY,
  canResumeRunningOrphan,
  parseAgentCheckpointExtras
} from "./running-orphan-plan.ts"

const base = {
  status: "running",
  kind: "agent",
  workspaceId: "ws_1",
  checkpoint: JSON.stringify({
    version: 1,
    request: { kind: "agent", sessionId: "s", modelId: "m" },
    modelMessages: [{ role: "user", content: "hi" }],
    resumeAt: TOOL_BOUNDARY
  })
}

test("工具边界 + modelMessages 才可续", () => {
  assert.equal(canResumeRunningOrphan(base), true)
  assert.equal(canResumeRunningOrphan({ ...base, status: "cancelled" }), false)
  assert.equal(canResumeRunningOrphan({ ...base, kind: "text" }), false)
  assert.equal(canResumeRunningOrphan({ ...base, workspaceId: null }), false)
})

test("没有 resumeAt 或只有原始 request 不能续", () => {
  assert.equal(
    canResumeRunningOrphan({
      ...base,
      checkpoint: JSON.stringify({ version: 1, request: { kind: "agent" } })
    }),
    false
  )
  assert.equal(canResumeRunningOrphan({ ...base, checkpoint: null }), false)
})

test("checkpoint 里还挂着 pending 审批则不续泵", () => {
  assert.equal(
    canResumeRunningOrphan({
      ...base,
      checkpoint: JSON.stringify({
        modelMessages: [{ role: "user", content: "hi" }],
        resumeAt: TOOL_BOUNDARY,
        pendingApprovals: [{ approvalId: "apr_1" }]
      })
    }),
    false
  )
})

test("parseAgentCheckpointExtras 读 resumeAt", () => {
  const extras = parseAgentCheckpointExtras(base.checkpoint)
  assert.equal(extras.resumeAt, TOOL_BOUNDARY)
  assert.equal(parseAgentCheckpointExtras("not-json").resumeAt, undefined)
})

test("running extras 带 denyAnyDesktop", () => {
  const extras = parseAgentCheckpointExtras(
    JSON.stringify({ ...JSON.parse(base.checkpoint), denyAnyDesktop: true })
  )
  assert.equal(extras.denyAnyDesktop, true)
})
