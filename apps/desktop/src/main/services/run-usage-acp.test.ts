/**
 * ACP usage.updated 经 mapAcpUpdate → consumeRun 必须落到 usage_json。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { mapAcpUpdate } from "../../../../../packages/agent-harness/src/acp/map-events.ts"

const {
  insertRun,
  getRun,
  getDatabase,
  deleteActiveRun,
  getActiveRun,
  holdAgentRun,
  consumeRun,
  parseRunUsage
} = await import("./run-usage-behavior.load.ts")

test("mapAcpUpdate 经 consume 写入 reportedCostUsd，不标 incomplete", async () => {
  const runId = `run_acp_usage_${Date.now()}`
  insertRun(getDatabase(), {
    id: runId,
    sessionId: `ses_${runId}`,
    workspaceId: "ws_1",
    kind: "agent",
    status: "running",
    modelId: "cli:claude",
    providerId: null,
    checkpoint: null,
    error: null,
    usageJson: null
  })
  try {
    holdAgentRun({
      runId,
      window: { isDestroyed: () => false, webContents: { send() {} } } as never,
      workspaceRoot: "/tmp",
      messages: [],
      input: {
        sessionId: `ses_${runId}`,
        workspaceId: "ws_1",
        modelId: "cli:claude",
        runtimeId: "claude",
        mode: "agent",
        attachments: [],
        messages: [{ role: "user", content: "x" }]
      }
    })
    const run = getActiveRun(runId)
    assert.ok(run)
    const warning = {
      type: "generation.warning",
      runId,
      code: "acp_resume_fallback",
      message: "fell back"
    }
    const usageEvents = mapAcpUpdate(
      { sessionUpdate: "usage_update", used: 2200, size: 200000, costUsd: 1.2 },
      runId
    )
    let sawWarning = false
    const originalSend = run.window.webContents.send
    run.window.webContents.send = ((...args: unknown[]) => {
      const event = args[1] as { type?: string } | undefined
      if (event?.type === "generation.warning") sawWarning = true
      return originalSend?.apply(run.window.webContents, args as never)
    }) as typeof originalSend
    await consumeRun(runId, run, (async function* () {
      yield warning
      for (const event of usageEvents) yield event
    })())
    assert.equal(sawWarning, true)
    assert.equal(run.usageIncomplete, undefined)
    assert.equal(run.reportedCostUsd, 1.2)
    assert.equal(run.inputTokens, 2200)
    const stored = parseRunUsage(getRun(getDatabase(), runId)?.usageJson)
    assert.equal(stored?.reportedCostUsd, 1.2)
    assert.equal(stored?.inputTokens, 2200)
    assert.notEqual(stored?.usageIncomplete, true)
  } finally {
    deleteActiveRun(runId)
  }
})
