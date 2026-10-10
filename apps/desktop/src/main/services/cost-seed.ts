/**
 * COST-P3 复检夹具：会话 + usage_json 形状。写库见 cost-seed-write。
 * 开发态 + 隔离 userData 才写；打包产物即使带环境变量也不写。
 */

export function isDevCostSeedAllowed(input: {
  flag: boolean
  packaged: boolean
  isolatedUserData: boolean
}): boolean {
  return input.flag && !input.packaged && input.isolatedUserData
}

export const COST_LIVE_MODEL_ID = "deepseek-flash"

export const COST_SEED_GUIDE = [
  { title: "DeepSeek · 估算金额", expect: "估算金额（快照 · DeepSeek Flash，含缓存/推理）" },
  { title: "Haiku · 分档未知", expect: "未知 / 「—」，原因是分档（tier）" },
  { title: "通义千问 · 无单价", expect: "「—」（映射已撤，没有用户单价）" },
  { title: "通义千问 · 自填单价", expect: "估算金额（来源：你填的单价）" },
  { title: "Claude CLI · 两组累计", expect: "上报合计 = 两组最新累计相加" },
  { title: "Ollama · 本地不计费", expect: "本地 · 不计费，不进未知" },
  { title: "准备失败 · 不进未知", expect: "不计入未知次数" },
  { title: "混合 · 部分未知", expect: "有估算金额，同时 unknownCount ≥ 1（千问无单价）" }
] as const

export type CostSeedUsage = {
  inputTokens?: number
  outputTokens?: number
  noCacheTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  reasoningTokens?: number
  maxStepInputTokens?: number
  stepInputIncomplete?: boolean
  usageIncomplete?: boolean
  reportedCostUsd?: number
  endedAt?: number
  runtimeId?: string
  acpSessionId?: string
  providerKind?: string
  modelId?: string
  userRates?: {
    inputPricePerMillion?: number
    outputPricePerMillion?: number
  }
}

export type CostSeedRun = {
  id: string
  status: "completed" | "failed" | "cancelled"
  modelId: string
  providerKind?: string
  runtimeId?: string
  usage?: CostSeedUsage
}

export type CostSeedSession = {
  key: string
  title: string
  prompt: string
  reply: string
  runs: CostSeedRun[]
}

export function buildCostFixture(now = Date.now()): { sessions: CostSeedSession[] } {
  return {
    sessions: [
      pricedDeepseek(now),
      tierUnknown(now),
      qwenNoPrice(now),
      qwenUserPrice(now),
      acpGroups(now),
      localUnbilled(now),
      prepFailed(now),
      mixedPartial(now)
    ]
  }
}

function pricedDeepseek(now: number): CostSeedSession {
  return {
    key: "priced",
    title: COST_SEED_GUIDE[0].title,
    prompt: "请总结这两次调用的缓存和推理用量。",
    reply: "夹具：两次 DeepSeek Flash，带缓存读和推理 token。",
    runs: [
      {
        id: "run_cost_ds_1",
        status: "completed",
        modelId: COST_LIVE_MODEL_ID,
        providerKind: "deepseek",
        usage: {
          inputTokens: 1_000_000,
          noCacheTokens: 800_000,
          cacheReadTokens: 200_000,
          outputTokens: 100_000,
          reasoningTokens: 40_000,
          maxStepInputTokens: 800_000,
          endedAt: now - 120_000,
          runtimeId: "enjoy-local",
          providerKind: "deepseek",
          modelId: COST_LIVE_MODEL_ID
        }
      },
      {
        id: "run_cost_ds_2",
        status: "completed",
        modelId: COST_LIVE_MODEL_ID,
        providerKind: "deepseek",
        usage: {
          inputTokens: 400_000,
          noCacheTokens: 400_000,
          outputTokens: 20_000,
          maxStepInputTokens: 400_000,
          endedAt: now - 60_000,
          runtimeId: "enjoy-local",
          providerKind: "deepseek",
          modelId: COST_LIVE_MODEL_ID
        }
      }
    ]
  }
}

function tierUnknown(now: number): CostSeedSession {
  return {
    key: "tier",
    title: COST_SEED_GUIDE[1].title,
    prompt: "这一步上下文会不会超档？",
    reply: "夹具：单步 input 超过 Haiku 5.5 最低档。",
    runs: [
      {
        id: "run_cost_tier",
        status: "completed",
        modelId: "claude-haiku-5-5",
        providerKind: "anthropic",
        usage: {
          inputTokens: 120_000,
          outputTokens: 800,
          maxStepInputTokens: 120_000,
          endedAt: now - 50_000,
          runtimeId: "enjoy-local",
          providerKind: "anthropic",
          modelId: "claude-haiku-5-5"
        }
      }
    ]
  }
}

function qwenNoPrice(now: number): CostSeedSession {
  return {
    key: "qwen-blank",
    title: COST_SEED_GUIDE[2].title,
    prompt: "映射撤了还能估吗？",
    reply: "夹具：qwen 官方端点没有用户单价。",
    runs: [
      {
        id: "run_cost_qwen_blank",
        status: "completed",
        modelId: "qwen-plus",
        providerKind: "qwen",
        usage: {
          inputTokens: 80_000,
          outputTokens: 2_000,
          maxStepInputTokens: 80_000,
          endedAt: now - 40_000,
          runtimeId: "enjoy-local",
          providerKind: "qwen",
          modelId: "qwen-plus"
        }
      }
    ]
  }
}

function qwenUserPrice(now: number): CostSeedSession {
  return {
    key: "qwen-user",
    title: COST_SEED_GUIDE[3].title,
    prompt: "我自己填了单价。",
    reply: "夹具：qwen 走用户自填单价。",
    runs: [
      {
        id: "run_cost_qwen_user",
        status: "completed",
        modelId: "qwen-plus",
        providerKind: "qwen",
        usage: {
          inputTokens: 500_000,
          noCacheTokens: 500_000,
          outputTokens: 100_000,
          maxStepInputTokens: 500_000,
          endedAt: now - 30_000,
          runtimeId: "enjoy-local",
          providerKind: "qwen",
          modelId: "qwen-plus",
          userRates: { inputPricePerMillion: 2, outputPricePerMillion: 4 }
        }
      }
    ]
  }
}

function acpGroups(now: number): CostSeedSession {
  return {
    key: "acp",
    title: COST_SEED_GUIDE[4].title,
    prompt: "两个 ACP 会话的累计费用怎么加？",
    reply: "夹具：两组 (claude, acp_a / acp_b) 各取最新累计再相加。",
    runs: [
      acpRun("run_cost_acp_a1", "acp_a", 0.2, now - 90_000),
      acpRun("run_cost_acp_a2", "acp_a", 0.8, now - 70_000),
      acpRun("run_cost_acp_b1", "acp_b", 0.5, now - 20_000)
    ]
  }
}

function acpRun(id: string, acpSessionId: string, reportedCostUsd: number, endedAt: number): CostSeedRun {
  return {
    id,
    status: "completed",
    modelId: "cli:claude",
    runtimeId: "claude",
    usage: {
      inputTokens: 2_200,
      reportedCostUsd,
      endedAt,
      runtimeId: "claude",
      acpSessionId,
      modelId: "cli:claude"
    }
  }
}

function localUnbilled(now: number): CostSeedSession {
  return {
    key: "local",
    title: COST_SEED_GUIDE[5].title,
    prompt: "本机模型怎么计费？",
    reply: "夹具：Ollama 本地不计费。",
    runs: [
      {
        id: "run_cost_ollama",
        status: "completed",
        modelId: "llama3.1",
        providerKind: "ollama",
        usage: {
          inputTokens: 12_000,
          outputTokens: 400,
          endedAt: now - 15_000,
          runtimeId: "enjoy-local",
          providerKind: "ollama",
          modelId: "llama3.1"
        }
      }
    ]
  }
}

function prepFailed(now: number): CostSeedSession {
  return {
    key: "prep-fail",
    title: COST_SEED_GUIDE[6].title,
    prompt: "开流就 401 了。",
    reply: "夹具：泵还没开始就失败，不应计入未知。",
    runs: [
      {
        id: "run_cost_prep_fail",
        status: "failed",
        modelId: COST_LIVE_MODEL_ID,
        providerKind: "deepseek",
        usage: {
          endedAt: now - 5_000,
          runtimeId: "enjoy-local",
          providerKind: "deepseek",
          modelId: COST_LIVE_MODEL_ID
        }
      }
    ]
  }
}

function mixedPartial(now: number): CostSeedSession {
  const priced = pricedDeepseek(now).runs[1]
  const blank = qwenNoPrice(now).runs[0]
  return {
    key: "mixed",
    title: COST_SEED_GUIDE[7].title,
    prompt: "一半能估，一半没有单价。",
    reply: "夹具：DeepSeek 估算 + 千问未知。",
    runs: [
      { ...priced, id: "run_cost_mixed_ds" },
      { ...blank, id: "run_cost_mixed_qwen" }
    ]
  }
}
