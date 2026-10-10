import assert from "node:assert/strict"
import { test } from "node:test"
import { buildSessionEstimatedCost, estimateRunCost } from "@enjoy-agents/providers/pricing"
import {
  buildCostFixture,
  costSeedSessionBinding,
  COST_LIVE_MODEL_ID,
  COST_SEED_GUIDE,
  isDevCostSeedAllowed
} from "./cost-seed.ts"

test("开发夹具只在未打包且隔离 userData 时开", () => {
  assert.equal(isDevCostSeedAllowed({ flag: true, packaged: false, isolatedUserData: true }), true)
  assert.equal(isDevCostSeedAllowed({ flag: true, packaged: true, isolatedUserData: true }), false)
  assert.equal(isDevCostSeedAllowed({ flag: true, packaged: false, isolatedUserData: false }), false)
  assert.equal(isDevCostSeedAllowed({ flag: false, packaged: false, isolatedUserData: true }), false)
})

test("夹具会话名覆盖六类复检场景", () => {
  const titles = buildCostFixture().sessions.map((session) => session.title)
  assert.deepEqual(
    titles,
    COST_SEED_GUIDE.map((row) => row.title)
  )
})

test("DeepSeek 会话估出金额；分档是 unknown；qwen 无单价是 —；自填单价能估", () => {
  const { sessions } = buildCostFixture()
  const priced = estimateOf(sessions, "priced")
  assert.equal(priced.unknownCount, 0)
  assert.equal(typeof priced.knownUsd, "number")
  assert.ok((priced.knownUsd ?? 0) > 0.2)

  const tier = estimateOf(sessions, "tier")
  assert.equal(tier.unknownCount, 1)
  assert.equal(tier.knownUsd, undefined)
  assert.deepEqual(tier.runs?.[0]?.missing, ["tier"])

  const blank = estimateOf(sessions, "qwen-blank")
  assert.equal(blank.unknownCount, 1)
  assert.deepEqual(blank.runs?.[0]?.missing, ["price"])

  const user = estimateOf(sessions, "qwen-user")
  assert.equal(user.unknownCount, 0)
  assert.equal(user.knownUsd, 1.4)
  assert.equal(user.runs?.[0]?.source, "user")
})

test("ACP 两组累计相加；本机不计费；泵前失败不进未知；混合部分未知", () => {
  const { sessions } = buildCostFixture()
  const acp = estimateOf(sessions, "acp")
  assert.equal(acp.reportedUsd, 1.3)
  assert.equal(acp.unknownCount, 0)

  const local = estimateOf(sessions, "local")
  assert.equal(local.unknownCount, 0)
  assert.equal(local.knownUsd, undefined)
  assert.equal(local.runs?.[0]?.status, "local_unbilled")

  const failed = estimateOf(sessions, "prep-fail")
  assert.equal(failed.unknownCount, 0)
  assert.equal(failed.runs?.some((run) => run.runId === "run_cost_prep_fail"), false)

  const mixed = estimateOf(sessions, "mixed")
  assert.ok((mixed.knownUsd ?? 0) > 0)
  assert.equal(mixed.unknownCount, 1)
  assert.deepEqual(mixed.missing, ["price"])
})

test("夹具按最后一次 run 写会话模型；Claude CLI 带 runtime", () => {
  const { sessions } = buildCostFixture()
  const priced = sessions.find((item) => item.key === "priced")
  assert.deepEqual(costSeedSessionBinding(priced?.runs ?? []), {
    modelId: COST_LIVE_MODEL_ID
  })
  const acp = sessions.find((item) => item.key === "acp")
  assert.deepEqual(costSeedSessionBinding(acp?.runs ?? []), {
    modelId: "cli:claude",
    runtimeId: "claude"
  })
  const qwen = sessions.find((item) => item.key === "qwen-blank")
  assert.deepEqual(costSeedSessionBinding(qwen?.runs ?? []), { modelId: "qwen-plus" })
})

test("实时 stub 用的 DeepSeek Flash 在快照里有单价", () => {
  const cost = estimateRunCost({
    usage: { inputTokens: 1_000_000, noCacheTokens: 800_000, cacheReadTokens: 200_000, outputTokens: 20_000 },
    providerKind: "deepseek",
    modelId: COST_LIVE_MODEL_ID
  })
  assert.equal(cost.status, "estimated")
  assert.ok((cost.usd ?? 0) > 0.1)
})

function estimateOf(
  sessions: ReturnType<typeof buildCostFixture>["sessions"],
  key: string
) {
  const session = sessions.find((item) => item.key === key)
  assert.ok(session, key)
  return buildSessionEstimatedCost({
    sessionId: `ses_${key}`,
    runs: session.runs.map((run) => ({
      runId: run.id,
      kind: "agent",
      status: run.status,
      usage: run.usage,
      providerKind: run.usage?.providerKind ?? run.providerKind,
      modelId: run.usage?.modelId ?? run.modelId,
      runtimeId: run.usage?.runtimeId ?? run.runtimeId,
      acpSessionId: run.usage?.acpSessionId,
      userRates: run.usage?.userRates
    }))
  })
}
