import assert from "node:assert/strict"
import { test } from "node:test"
import { buildSessionEstimatedCost } from "./session-cost.ts"

test("同一 ACP 会话 3 个 run 的累计费用只取最后一次", () => {
  const sum = buildSessionEstimatedCost({
    sessionId: "ses_acp_cost",
    runs: [
      {
        runId: "r1",
        status: "completed",
        runtimeId: "claude",
        endedAt: 10,
        usage: { reportedCostUsd: 0.1, runtimeId: "claude" }
      },
      {
        runId: "r2",
        status: "completed",
        runtimeId: "claude",
        endedAt: 20,
        usage: { reportedCostUsd: 0.3, runtimeId: "claude" }
      },
      {
        runId: "r3",
        status: "completed",
        runtimeId: "claude",
        endedAt: 30,
        usage: { reportedCostUsd: 0.6, runtimeId: "claude" }
      }
    ]
  })
  assert.equal(sum.reportedUsd, 0.6)
  assert.equal(sum.knownUsd, undefined)
})

test("同一 Enjoy 会话里两个 ACP 会话的累计费用按组相加", () => {
  const sum = buildSessionEstimatedCost({
    sessionId: "ses_acp_groups",
    runs: [
      {
        runId: "r1",
        status: "completed",
        runtimeId: "claude",
        acpSessionId: "acp_a",
        endedAt: 10,
        usage: { reportedCostUsd: 0.2, runtimeId: "claude", acpSessionId: "acp_a" }
      },
      {
        runId: "r2",
        status: "completed",
        runtimeId: "claude",
        acpSessionId: "acp_b",
        endedAt: 20,
        usage: { reportedCostUsd: 0.5, runtimeId: "claude", acpSessionId: "acp_b" }
      }
    ]
  })
  assert.equal(sum.reportedUsd, 0.7)
})

test("空 usage_json 的已完成本地 run 是 unknown，不是零用量跳过", () => {
  const sum = buildSessionEstimatedCost({
    sessionId: "ses_blank",
    runs: [
      {
        runId: "empty",
        status: "completed",
        providerKind: "anthropic",
        modelId: "claude-sonnet-4-5",
        usage: { runtimeId: "enjoy-local", modelId: "claude-sonnet-4-5" }
      },
      {
        runId: "zero",
        status: "completed",
        providerKind: "anthropic",
        modelId: "claude-sonnet-4-5",
        usage: { inputTokens: 0, outputTokens: 0 }
      }
    ]
  })
  assert.equal(sum.unknownCount, 1)
  assert.deepEqual(sum.missing, ["usage"])
  assert.equal(sum.runs?.some((run) => run.runId === "empty" && run.status === "unknown"), true)
  assert.equal(sum.runs?.some((run) => run.runId === "zero"), false)
})
