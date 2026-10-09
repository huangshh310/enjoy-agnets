/**
 * 恢复 / 续跑 / ACP 用量走生产 persist → hydrate → apply。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const {
  insertRun,
  getRun,
  getDatabase,
  deleteActiveRun,
  getActiveRun,
  holdAgentRun,
  applyActiveRunUsage,
  consumeRun,
  hydrateActiveRunUsage,
  parseRunUsage
} = await import("./run-usage-behavior.load.ts")

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

test("第 1 泵写库后 restore 再跑第 2 泵，usage_json 为两泵之和", () => {
  const runId = `run_hydrate_${Date.now()}`
  seedRun(
    runId,
    JSON.stringify({
      inputTokens: 100,
      noCacheTokens: 80,
      cacheReadTokens: 20,
      outputTokens: 10
    })
  )
  try {
    hold(runId)
    hydrateActiveRunUsage(runId)
    const restored = getActiveRun(runId)
    assert.ok(restored)
    assert.equal(restored.inputTokens, 100)
    assert.equal(restored.noCacheTokens, 80)
    applyActiveRunUsage(runId, restored, { inputTokens: 50, outputTokens: 8 })
    const stored = parseRunUsage(getRun(getDatabase(), runId)?.usageJson)
    assert.equal(stored?.inputTokens, 150)
    assert.equal(stored?.noCacheTokens, 130)
    assert.equal(stored?.outputTokens, 18)
  } finally {
    deleteActiveRun(runId)
  }
})

test("读不到 usage_json 的 restore 标 usageIncomplete", () => {
  const runId = `run_hydrate_miss_${Date.now()}`
  seedRun(runId)
  try {
    hold(runId)
    hydrateActiveRunUsage(runId)
    assert.equal(getActiveRun(runId)?.usageIncomplete, true)
  } finally {
    deleteActiveRun(runId)
  }
})

test("多次 ACP usage_update 之后 token 等于最后一次", () => {
  const runId = `run_acp_snap_${Date.now()}`
  seedRun(runId)
  try {
    hold(runId, "claude")
    const run = getActiveRun(runId)
    assert.ok(run)
    applyActiveRunUsage(runId, run, { inputTokens: 1200, reportedCostUsd: 0.4 })
    applyActiveRunUsage(runId, run, { inputTokens: 53000, reportedCostUsd: 0.9 })
    assert.equal(run.inputTokens, 53000)
    assert.equal(run.reportedCostUsd, 0.9)
    const stored = parseRunUsage(getRun(getDatabase(), runId)?.usageJson)
    assert.equal(stored?.inputTokens, 53000)
    assert.equal(stored?.reportedCostUsd, 0.9)
  } finally {
    deleteActiveRun(runId)
  }
})

test("泵抛错走 finally 时标记用量不完整", async () => {
  const runId = `run_pump_fail_${Date.now()}`
  seedRun(runId)
  try {
    hold(runId)
    const run = getActiveRun(runId)
    assert.ok(run)
    async function* boom() {
      throw new Error("stream boom")
    }
    await assert.rejects(() => consumeRun(runId, run, boom()))
    assert.equal(run.usageIncomplete, true)
    assert.equal(parseRunUsage(getRun(getDatabase(), runId)?.usageJson)?.usageIncomplete, true)
  } finally {
    deleteActiveRun(runId)
  }
})

test("userRates 首次写入后固定，并记下 snapshotVersion", () => {
  const runId = `run_rates_freeze_${Date.now()}`
  seedRun(runId)
  try {
    hold(runId)
    const run = getActiveRun(runId)
    assert.ok(run)
    run.secret = {
      id: "p1",
      kind: "anthropic",
      models: [{ id: "claude-sonnet-4-5", inputPricePerMillion: 9, outputPricePerMillion: 20 }]
    } as never
    applyActiveRunUsage(runId, run, { inputTokens: 10, outputTokens: 2 })
    const first = parseRunUsage(getRun(getDatabase(), runId)?.usageJson)
    assert.equal(first?.userRates?.inputPricePerMillion, 9)
    assert.equal(typeof first?.snapshotVersion, "string")
    run.secret = {
      id: "p1",
      kind: "anthropic",
      models: [{ id: "claude-sonnet-4-5", inputPricePerMillion: 99, outputPricePerMillion: 99 }]
    } as never
    applyActiveRunUsage(runId, run, { inputTokens: 5, outputTokens: 1 })
    const second = parseRunUsage(getRun(getDatabase(), runId)?.usageJson)
    assert.equal(second?.userRates?.inputPricePerMillion, 9)
    assert.equal(second?.snapshotVersion, first?.snapshotVersion)
  } finally {
    deleteActiveRun(runId)
  }
})
