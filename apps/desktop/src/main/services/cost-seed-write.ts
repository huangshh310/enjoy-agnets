/**
 * 把 COST-P3 复检夹具写入隔离库。只给开发入口调用。
 */
import { insertRun } from "@enjoy-agents/db"
import { estimateRunCost, PRICE_SNAPSHOT } from "@enjoy-agents/providers/pricing"
import { getDatabase, setSetting } from "./database"
import { persistMessage } from "./persist-session"
import { createSession } from "./session-queries"
import { upsertProfile } from "./secrets"
import { recordMetric } from "./telemetry-service"
import {
  buildCostFixture,
  COST_LIVE_MODEL_ID,
  type CostSeedRun,
  type CostSeedUsage
} from "./cost-seed"

export async function writeCostFixture(workspaceId: string, now = Date.now()): Promise<void> {
  await seedCostProfiles()
  setSetting("defaultModelId", COST_LIVE_MODEL_ID)
  const fixture = buildCostFixture(now)
  for (const session of fixture.sessions) {
    const created = await createSession(workspaceId, session.title)
    persistMessage(created.id, "user", session.prompt)
    persistMessage(created.id, "assistant", session.reply)
    for (const run of session.runs) writeSeedRun(workspaceId, created.id, run)
  }
}

async function seedCostProfiles(): Promise<void> {
  await upsertProfile({
    name: "COST DeepSeek",
    kind: "deepseek",
    apiKey: "sk-e2e-cost-seed",
    modelId: COST_LIVE_MODEL_ID,
    models: [{ id: COST_LIVE_MODEL_ID, label: "DeepSeek Flash" }],
    activate: true
  })
  await upsertProfile({
    name: "COST Qwen 无单价",
    kind: "qwen",
    apiKey: "sk-e2e-cost-qwen",
    modelId: "qwen-plus",
    models: [{ id: "qwen-plus", label: "Qwen Plus" }]
  })
  await upsertProfile({
    name: "COST Qwen 自填单价",
    kind: "qwen",
    apiKey: "sk-e2e-cost-qwen-user",
    modelId: "qwen-plus",
    models: [
      {
        id: "qwen-plus",
        label: "Qwen Plus",
        inputPricePerMillion: 2,
        outputPricePerMillion: 4
      }
    ]
  })
}

function writeSeedRun(workspaceId: string, sessionId: string, run: CostSeedRun): void {
  const usageJson = run.usage ? JSON.stringify(withSnapshot(run.usage)) : null
  insertRun(getDatabase(), {
    id: run.id,
    sessionId,
    workspaceId,
    kind: "agent",
    status: run.status,
    modelId: run.modelId,
    providerId: null,
    checkpoint: null,
    error: run.status === "failed" ? "401 Unauthorized" : null,
    usageJson
  })
  if (run.status !== "completed" || !run.usage) return
  const estimate = estimateRunCost({
    usage: run.usage,
    runtimeId: run.usage.runtimeId ?? run.runtimeId,
    providerKind: run.usage.providerKind ?? run.providerKind,
    modelId: run.usage.modelId ?? run.modelId,
    userRates: run.usage.userRates,
    reportedCostUsd: run.usage.reportedCostUsd
  })
  recordMetric({
    runId: run.id,
    kind: "agent",
    modelId: run.modelId,
    status: "completed",
    inputTokens: run.usage.inputTokens,
    outputTokens: run.usage.outputTokens,
    cacheReadTokens: run.usage.cacheReadTokens,
    cacheWriteTokens: run.usage.cacheWriteTokens,
    reasoningTokens: run.usage.reasoningTokens,
    estimatedCostUsd: estimate.status === "estimated" ? estimate.usd : undefined,
    costStatus: estimate.status,
    costMissing: estimate.missing,
    durationMs: 1_800,
    ttfoMs: 240
  })
}

function withSnapshot(usage: CostSeedUsage): CostSeedUsage & { snapshotVersion: string } {
  return { ...usage, snapshotVersion: PRICE_SNAPSHOT.version }
}
