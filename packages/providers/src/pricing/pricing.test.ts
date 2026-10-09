import assert from "node:assert/strict"
import { test } from "node:test"
import { datedIdAliases, uniqueExistingAliases } from "./alias-policy.ts"
import { kindFromModelsDevProvider } from "./models-dev-kind.ts"
import { estimateRunCost } from "./estimate.ts"
import { matchModelRate } from "./match.ts"
import { buildSessionEstimatedCost } from "./session-cost.ts"
import { PRICE_SNAPSHOT } from "./snapshot.ts"
import type { PriceSnapshot } from "./types.ts"

const TABLE: PriceSnapshot = {
  version: "test",
  date: "2026-01-02",
  source: "models.dev",
  models: [
    {
      provider: "anthropic",
      modelId: "claude-sonnet-4-5",
      aliases: ["claude-sonnet-4-5-20250929"],
      input: 3,
      output: 15,
      cacheRead: 0.3,
      cacheWrite: 3.75
    },
    {
      provider: "anthropic",
      modelId: "claude-sonnet-4-5-20250929",
      input: 3,
      output: 15,
      cacheRead: 0.3,
      cacheWrite: 3.75
    },
    { provider: "openai", modelId: "gpt-4o", input: 2.5, output: 10, cacheRead: 1.25 }
  ]
}

test("精确匹配命中；前缀与未命中是未知", () => {
  const hit = matchModelRate({
    providerKind: "anthropic",
    modelId: "claude-sonnet-4-5",
    snapshot: TABLE
  })
  assert.equal(hit?.source, "snapshot")
  assert.equal(hit?.rate.input, 3)
  const prefix = matchModelRate({
    providerKind: "anthropic",
    modelId: "claude-sonnet-4",
    snapshot: TABLE
  })
  assert.equal(prefix, undefined)
  const wrongProvider = matchModelRate({
    providerKind: "openai",
    modelId: "claude-sonnet-4-5",
    snapshot: TABLE
  })
  assert.equal(wrongProvider, undefined)
  const dated = matchModelRate({
    providerKind: "anthropic",
    modelId: "claude-sonnet-4-5-20250929",
    snapshot: TABLE
  })
  assert.equal(dated?.rate.output, 15)
})

test("用户单价优先，未填的项回落快照", () => {
  const matched = matchModelRate({
    providerKind: "anthropic",
    modelId: "claude-sonnet-4-5",
    userRates: { inputPricePerMillion: 9, outputPricePerMillion: 20 },
    snapshot: TABLE
  })
  assert.equal(matched?.source, "mixed")
  assert.equal(matched?.rate.input, 9)
  assert.equal(matched?.rate.output, 20)
  assert.equal(matched?.rate.cacheRead, 0.3)
})

test("有缓存 token 但缺单价 → 整次未知，不是 0", () => {
  const cache = estimateRunCost({
    usage: { inputTokens: 1000, outputTokens: 100, cacheReadTokens: 200 },
    providerKind: "openai",
    modelId: "mystery",
    userRates: { inputPricePerMillion: 1, outputPricePerMillion: 2 },
    snapshot: TABLE
  })
  assert.equal(cache.status, "unknown")
  assert.equal(cache.usd, undefined)
  assert.deepEqual(cache.missing, ["cacheRead"])
})

test("缓存和推理同时存在时不重复计费；缺推理价仍能估算", () => {
  const both = estimateRunCost({
    usage: {
      inputTokens: 200_000,
      noCacheTokens: 100_000,
      cacheReadTokens: 100_000,
      outputTokens: 50_000,
      reasoningTokens: 20_000
    },
    providerKind: "anthropic",
    modelId: "claude-sonnet-4-5",
    snapshot: TABLE
  })
  assert.equal(both.status, "estimated")
  assert.equal(both.usd, 1.08)

  const cacheOnly = estimateRunCost({
    usage: {
      inputTokens: 100_000,
      noCacheTokens: 0,
      cacheReadTokens: 100_000,
      outputTokens: 0
    },
    providerKind: "anthropic",
    modelId: "claude-sonnet-4-5",
    snapshot: TABLE
  })
  assert.equal(cacheOnly.status, "estimated")
  assert.equal(cacheOnly.usd, 0.03)

  const reasoning = estimateRunCost({
    usage: { inputTokens: 1_000_000, outputTokens: 1_000_000, reasoningTokens: 200_000 },
    providerKind: "anthropic",
    modelId: "claude-sonnet-4-5",
    snapshot: TABLE
  })
  assert.equal(reasoning.status, "estimated")
  assert.equal(reasoning.usd, 18)
  assert.equal(reasoning.missing, undefined)
})

test("缓存与推理缺失（undefined）不当成 0，仍可按已知分项估算", () => {
  const result = estimateRunCost({
    usage: { inputTokens: 1_000_000, outputTokens: 1_000_000 },
    providerKind: "anthropic",
    modelId: "claude-sonnet-4-5",
    snapshot: TABLE
  })
  assert.equal(result.status, "estimated")
  assert.equal(result.usd, 18)
  assert.equal(result.source, "snapshot")
})

test("本地模型不计费；ACP 没有上报就不显示", () => {
  const local = estimateRunCost({
    usage: { inputTokens: 10, outputTokens: 10 },
    providerKind: "ollama",
    modelId: "llama3.1",
    snapshot: TABLE
  })
  assert.equal(local.status, "local_unbilled")
  assert.equal(local.usd, undefined)

  const studio = estimateRunCost({
    usage: { inputTokens: 10, outputTokens: 10 },
    providerKind: "lmstudio",
    modelId: "local-qwen",
    snapshot: TABLE
  })
  assert.equal(studio.status, "local_unbilled")

  const acp = estimateRunCost({
    usage: { inputTokens: 2200 },
    runtimeId: "claude",
    providerKind: "anthropic",
    modelId: "opus"
  })
  assert.equal(acp.status, "not_reported")
  assert.equal(acp.usd, undefined)

  const reported = estimateRunCost({
    usage: { inputTokens: 2200 },
    runtimeId: "claude",
    reportedCostUsd: 1.2
  })
  assert.equal(reported.status, "reported")
  assert.equal(reported.usd, 1.2)
  assert.equal(reported.source, "engine")
})

test("会话合计与未知次数；缺 usage_json 计入未知；零用量不计入", () => {
  const sum = buildSessionEstimatedCost({
    sessionId: "ses_1",
    snapshot: TABLE,
    runs: [
      {
        runId: "r1",
        providerKind: "anthropic",
        modelId: "claude-sonnet-4-5",
        usage: { inputTokens: 1_000_000, outputTokens: 0 }
      },
      {
        runId: "r2",
        providerKind: "custom",
        modelId: "mystery",
        usage: { inputTokens: 10, outputTokens: 10 }
      },
      {
        runId: "r3",
        providerKind: "ollama",
        modelId: "llama3.1",
        usage: { inputTokens: 10, outputTokens: 10 }
      },
      {
        runId: "r4",
        runtimeId: "codex",
        usage: { inputTokens: 9, runtimeId: "codex" }
      },
      { runId: "r5" },
      {
        runId: "r6",
        providerKind: "anthropic",
        modelId: "claude-sonnet-4-5",
        usage: { inputTokens: 0, outputTokens: 0 }
      }
    ]
  })
  assert.equal(sum.knownUsd, 3)
  assert.equal(sum.unknownCount, 2)
  assert.equal(sum.reportedUsd, undefined)
  assert.equal(sum.runs?.some((run) => run.runId === "r5" && run.status === "unknown"), true)
  assert.equal(sum.runs?.some((run) => run.runId === "r6"), false)
})

test("workflow / 生图 / 还在跑 / 准备失败 / 无用量 ACP 与本地模型都不计入 unknownCount", () => {
  const sum = buildSessionEstimatedCost({
    sessionId: "ses_filter",
    snapshot: TABLE,
    runs: [
      { runId: "wf", kind: "workflow", status: "completed" },
      { runId: "img", kind: "image", status: "completed" },
      { runId: "vid", kind: "video", status: "completed" },
      { runId: "live", kind: "agent", status: "running" },
      { runId: "wait", kind: "agent", status: "waiting_review" },
      { runId: "prep", kind: "agent", status: "failed" },
      { runId: "acp", kind: "agent", status: "completed", runtimeId: "claude" },
      { runId: "local", kind: "agent", status: "completed", providerKind: "ollama" },
      {
        runId: "ok",
        kind: "agent",
        status: "completed",
        providerKind: "anthropic",
        modelId: "claude-sonnet-4-5",
        usage: { inputTokens: 1_000_000, outputTokens: 0 }
      }
    ]
  })
  assert.equal(sum.unknownCount, 0)
  assert.equal(sum.knownUsd, 3)
  assert.equal(sum.runs?.some((run) => run.runId === "acp" && run.status === "not_reported"), true)
  assert.equal(sum.runs?.some((run) => run.runId === "local" && run.status === "local_unbilled"), true)
  assert.equal(sum.runs?.some((run) => run.runId === "wf"), false)
  assert.equal(sum.runs?.some((run) => run.runId === "live"), false)
  assert.equal(sum.runs?.some((run) => run.runId === "prep"), false)
})

test("零用量在非官方端点先判未知，不套官方价", () => {
  const result = estimateRunCost({
    usage: { inputTokens: 0, outputTokens: 0 },
    providerKind: "anthropic",
    modelId: "claude-sonnet-4-5",
    baseURL: "https://relay.example/v1",
    snapshot: TABLE
  })
  assert.equal(result.status, "unknown")
  assert.deepEqual(result.missing, ["price"])
})

test("一轮缺用量则整次未知", () => {
  const result = estimateRunCost({
    usage: { inputTokens: 100, outputTokens: 10, usageIncomplete: true },
    providerKind: "anthropic",
    modelId: "claude-sonnet-4-5",
    snapshot: TABLE
  })
  assert.equal(result.status, "unknown")
  assert.deepEqual(result.missing, ["usage"])
  assert.equal(result.usd, undefined)
})

test("非官方 baseURL 且没填用户单价 → 未知，不套官方价", () => {
  const result = estimateRunCost({
    usage: { inputTokens: 1_000_000, outputTokens: 0 },
    providerKind: "anthropic",
    modelId: "claude-sonnet-4-5",
    baseURL: "https://relay.example/v1",
    snapshot: TABLE
  })
  assert.equal(result.status, "unknown")
  assert.deepEqual(result.missing, ["price"])
})

test("models.dev 供应商 id 只做精确映射", () => {
  assert.equal(kindFromModelsDevProvider("alibaba"), "qwen")
  assert.equal(kindFromModelsDevProvider("moonshotai"), "kimi")
  assert.equal(kindFromModelsDevProvider("volcengine"), "doubao")
  assert.equal(kindFromModelsDevProvider("zhipuai"), "zhipu")
  assert.equal(kindFromModelsDevProvider("togetherai"), "together")
  assert.equal(kindFromModelsDevProvider("alibaba-coding-plan"), undefined)
})

test("datedIdAliases 只收价目相同的日期后缀", () => {
  const aliased = datedIdAliases([
    { provider: "openai", modelId: "gpt-x", input: 2, output: 8 },
    { provider: "openai", modelId: "gpt-x-20240101", input: 2, output: 8 },
    { provider: "openai", modelId: "gpt-x-20240202", input: 9, output: 9 }
  ])
  const canonical = aliased.find((model) => model.modelId === "gpt-x")
  assert.deepEqual(canonical?.aliases, ["gpt-x-20240101"])
})

test("快照含精确映射的 qwen / kimi / doubao / zhipu / together", () => {
  const kinds = new Set(PRICE_SNAPSHOT.models.map((model) => model.provider))
  for (const kind of ["qwen", "kimi", "doubao", "zhipu", "together"]) {
    assert.equal(kinds.has(kind), true, `missing ${kind}`)
  }
})

test("真实快照没有一对多别名；家族名匹配不到", () => {
  assert.equal(
    PRICE_SNAPSHOT.models.some((model) => model.provider === "gateway"),
    false
  )
  const seen = new Map<string, string>()
  for (const model of uniqueExistingAliases(PRICE_SNAPSHOT.models)) {
    for (const alias of model.aliases ?? []) {
      const key = `${model.provider}\0${alias}`
      const prev = seen.get(key)
      assert.equal(prev, undefined, `alias ${alias} maps to more than one model`)
      seen.set(key, model.modelId)
    }
  }
  assert.equal(
    matchModelRate({ providerKind: "openai", modelId: "gpt" }),
    undefined
  )
  assert.equal(
    matchModelRate({ providerKind: "anthropic", modelId: "claude-opus" }),
    undefined
  )
})

test("主路径估价不调用 fetch", async () => {
  const original = globalThis.fetch
  globalThis.fetch = () => {
    throw new Error("network should not run")
  }
  try {
    const result = estimateRunCost({
      usage: { inputTokens: 1000, outputTokens: 1000 },
      providerKind: "openai",
      modelId: "gpt-4o",
      snapshot: TABLE
    })
    assert.equal(result.status, "estimated")
    assert.ok(typeof result.usd === "number")
    const builtin = matchModelRate({
      providerKind: "anthropic",
      modelId: "claude-sonnet-4-5"
    })
    assert.ok(builtin?.rate.input !== undefined)
    assert.equal(PRICE_SNAPSHOT.source, "models.dev")
  } finally {
    globalThis.fetch = original
  }
})
