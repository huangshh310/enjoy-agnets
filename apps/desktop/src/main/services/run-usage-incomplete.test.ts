/**
 * 泵未 finish、单步 input 不全、空泵、ACP 最新绑定。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { estimateRunCost, buildSessionEstimatedCost } from "@enjoy-agents/providers/pricing"

const {
  insertRun,
  getRun,
  getDatabase,
  deleteActiveRun,
  getActiveRun,
  holdAgentRun,
  consumeRun,
  hydrateActiveRunUsage,
  parseRunUsage,
  persistActiveRun,
  rememberAcpSessionId
} = await import("./run-usage-behavior.load.ts")

const TIER_TABLE = {
  version: "test",
  date: "2026-01-02",
  source: "models.dev",
  models: [
    {
      provider: "anthropic",
      modelId: "tiered-sonnet",
      input: 3,
      output: 15,
      tierContext: 32_000
    }
  ]
}

function hold(runId: string, runtimeId = "enjoy-local") {
  holdAgentRun({
    runId,
    window: { isDestroyed: () => false, webContents: { send() {} } } as never,
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId: `ses_${runId}`,
      workspaceId: "ws_1",
      modelId: runtimeId === "enjoy-local" ? "claude-sonnet-4-5" : `cli:${runtimeId}`,
      runtimeId,
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "x" }]
    }
  })
}

function seedRun(runId: string, usageJson?: string) {
  insertRun(getDatabase(), {
    id: runId,
    sessionId: `ses_${runId}`,
    workspaceId: "ws_1",
    kind: "agent",
    status: "running",
    modelId: "claude-sonnet-4-5",
    providerId: null,
    checkpoint: null,
    error: null,
    usageJson: usageJson ?? null
  })
}

test("只有 finish-step、没有 finish 时标 incomplete，估算 unknown", async () => {
  const runId = `run_step_only_${Date.now()}`
  seedRun(runId)
  try {
    hold(runId)
    const run = getActiveRun(runId)
    assert.ok(run)
    await consumeRun(
      runId,
      run,
      (async function* () {
        yield { type: "finish-step", id: "s1", usage: { inputTokens: 30_000, outputTokens: 1 } }
      })()
    )
    assert.equal(run.usageIncomplete, true)
    assert.equal(run.inputTokens, undefined)
    assert.equal(run.maxStepInputTokens, 30_000)
    const cost = estimateRunCost({
      usage: {
        inputTokens: run.inputTokens,
        outputTokens: run.outputTokens,
        maxStepInputTokens: run.maxStepInputTokens,
        usageIncomplete: run.usageIncomplete
      },
      providerKind: "anthropic",
      modelId: "claude-sonnet-4-5"
    })
    assert.equal(cost.status, "unknown")
    assert.deepEqual(cost.missing, ["usage"])
  } finally {
    deleteActiveRun(runId)
  }
})

test("部分步骤没报 input 时记下 stepInputIncomplete，hydrate 后有分档仍 unknown", async () => {
  const runId = `run_step_gap_${Date.now()}`
  seedRun(runId)
  try {
    hold(runId)
    const run = getActiveRun(runId)
    assert.ok(run)
    await consumeRun(
      runId,
      run,
      (async function* () {
        yield { type: "finish-step", id: "s1", usage: { outputTokens: 1 } }
        yield { type: "finish-step", id: "s2", usage: { inputTokens: 10_000, outputTokens: 1 } }
        yield { type: "finish", totalUsage: { inputTokens: 20_000, outputTokens: 2 } }
      })()
    )
    assert.equal(run.stepInputIncomplete, true)
    assert.equal(run.maxStepInputTokens, 10_000)
    assert.equal(run.inputTokens, 20_000)
    const stored = parseRunUsage(getRun(getDatabase(), runId)?.usageJson)
    assert.equal(stored?.stepInputIncomplete, true)
    deleteActiveRun(runId)
    hold(runId)
    hydrateActiveRunUsage(runId)
    const restored = getActiveRun(runId)
    assert.equal(restored?.stepInputIncomplete, true)
    const cost = estimateRunCost({
      usage: {
        inputTokens: 20_000,
        outputTokens: 2,
        maxStepInputTokens: 10_000,
        stepInputIncomplete: restored?.stepInputIncomplete
      },
      providerKind: "anthropic",
      modelId: "tiered-sonnet",
      snapshot: TIER_TABLE
    })
    assert.equal(cost.status, "unknown")
    assert.deepEqual(cost.missing, ["tier"])
  } finally {
    deleteActiveRun(runId)
  }
})

test("一个泵都没跑的 completed run 仍是 unknown", () => {
  const runId = `run_never_pump_${Date.now()}`
  seedRun(runId)
  try {
    hold(runId)
    const run = getActiveRun(runId)
    assert.ok(run)
    persistActiveRun(run, runId, "completed")
    const stored = parseRunUsage(getRun(getDatabase(), runId)?.usageJson)
    assert.equal(stored?.usageIncomplete, true)
    const sum = buildSessionEstimatedCost({
      sessionId: `ses_${runId}`,
      runs: [
        {
          runId,
          status: "completed",
          providerKind: "anthropic",
          modelId: "claude-sonnet-4-5",
          usage: stored
        }
      ]
    })
    assert.equal(sum.unknownCount, 1)
    assert.equal(sum.runs?.[0]?.status, "unknown")
    assert.deepEqual(sum.runs?.[0]?.missing, ["usage"])
  } finally {
    deleteActiveRun(runId)
  }
})

test("ACP 会话 id 以最新一次绑定为准", () => {
  const runId = `run_acp_bind_${Date.now()}`
  seedRun(
    runId,
    JSON.stringify({
      inputTokens: 12,
      reportedCostUsd: 0.2,
      acpSessionId: "acp_old"
    })
  )
  try {
    hold(runId, "claude")
    hydrateActiveRunUsage(runId)
    const run = getActiveRun(runId)
    assert.ok(run)
    assert.equal(run.acpSessionId, "acp_old")
    rememberAcpSessionId(`ses_${runId}`, "claude", "acp_new")
    assert.equal(getActiveRun(runId)?.acpSessionId, "acp_new")
    const stored = parseRunUsage(getRun(getDatabase(), runId)?.usageJson)
    assert.equal(stored?.acpSessionId, "acp_new")
    assert.equal(stored?.inputTokens, 12)
  } finally {
    deleteActiveRun(runId)
  }
})

test("map-part 经 consume 用 finish.totalUsage 估算", async () => {
  const runId = `run_total_usage_${Date.now()}`
  seedRun(runId)
  try {
    hold(runId)
    const run = getActiveRun(runId)
    assert.ok(run)
    await consumeRun(
      runId,
      run,
      (async function* () {
        yield { type: "finish-step", id: "s1", usage: { inputTokens: 800, outputTokens: 10 } }
        yield {
          type: "finish",
          usage: { inputTokens: 1, outputTokens: 1 },
          totalUsage: { inputTokens: 1_000_000, outputTokens: 0, totalTokens: 1_000_000 }
        }
      })()
    )
    assert.equal(run.inputTokens, 1_000_000)
    assert.equal(run.outputTokens, 0)
    assert.equal(run.maxStepInputTokens, 800)
    assert.equal(run.usageIncomplete, undefined)
    const cost = estimateRunCost({
      usage: {
        inputTokens: run.inputTokens,
        outputTokens: run.outputTokens,
        maxStepInputTokens: run.maxStepInputTokens
      },
      providerKind: "anthropic",
      modelId: "claude-sonnet-4-5"
    })
    assert.equal(cost.status, "estimated")
    assert.equal(cost.usd, 3)
  } finally {
    deleteActiveRun(runId)
  }
})
