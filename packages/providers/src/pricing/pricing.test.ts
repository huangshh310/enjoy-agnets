import assert from "node:assert/strict"
import { test } from "node:test"
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
      aliases: ["claude-sonnet-4-5-alias"],
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
  const alias = matchModelRate({
    providerKind: "anthropic",
    modelId: "claude-sonnet-4-5-alias",
    snapshot: TABLE
  })
  assert.equal(alias?.rate.output, 15)
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

test("有缓存或推理 token 但缺单价 → 整次未知，不是 0", () => {
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

  const reasoning = estimateRunCost({
    usage: { inputTokens: 100, outputTokens: 50, reasoningTokens: 20 },
    providerKind: "anthropic",
    modelId: "claude-sonnet-4-5",
    snapshot: TABLE
  })
  assert.equal(reasoning.status, "unknown")
  assert.equal(reasoning.usd, undefined)
  assert.deepEqual(reasoning.missing, ["reasoning"])
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

test("会话合计与未知次数；本地和未上报不加进未知", () => {
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
      }
    ]
  })
  assert.equal(sum.knownUsd, 3)
  assert.equal(sum.unknownCount, 1)
  assert.equal(sum.reportedUsd, undefined)
  assert.equal(sum.runs?.length, 4)
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
