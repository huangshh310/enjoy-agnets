import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { DEEPSEEK_RETIRED_MODEL_IDS, isOfficialDeepseekEndpointUrl } from "./deepseek-retired-models.ts"
import { presetFor } from "./presets.ts"
import { estimateRunCost } from "./pricing/estimate.ts"
import { PRICE_SNAPSHOT } from "./pricing/snapshot.ts"
import { migrateStoredProfile, normalizeVault, type LooseProfile } from "./profile-migrate.ts"

const OFFICIAL = {
  openai: "https://api.deepseek.com/v1",
  "openai-responses": "https://api.deepseek.com/v1",
  anthropic: "https://api.deepseek.com/anthropic"
}

function stored(over: Partial<LooseProfile> = {}): LooseProfile {
  return {
    id: "prv_ds",
    name: "DeepSeek",
    kind: "deepseek",
    enabled: true,
    endpoints: OFFICIAL,
    baseAPI: "openai",
    keys: [{ id: "k1", name: "", apiKey: "sk-test", enabled: true }],
    reasoningFamily: "auto",
    modelId: "deepseek-chat",
    models: [
      { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", enabled: true, source: "preset" },
      { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", enabled: true, source: "preset" },
      { id: "deepseek-chat", label: "DeepSeek Chat (legacy)", enabled: true, source: "preset" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner", enabled: true, source: "preset" }
    ],
    ...over
  }
}

/** 读档 → 写回 → 再读档，模拟连续两次启动。 */
function twice(raw: LooseProfile) {
  const first = migrateStoredProfile(raw)
  const second = migrateStoredProfile(JSON.parse(JSON.stringify(first.profile)) as LooseProfile)
  return { first, second }
}

const ids = (profile: { models?: { id: string }[] }) => profile.models?.map((m) => m.id)

test("预设只列官方当前名 deepseek-flash / deepseek-v4-pro，停用名和临时转发名都不在", () => {
  const presetIds = presetFor("deepseek").models.map((m) => m.id)
  assert.deepEqual(presetIds, ["deepseek-flash", "deepseek-v4-pro"])
  for (const retired of Object.keys(DEEPSEEK_RETIRED_MODEL_IDS)) assert.ok(!presetIds.includes(retired), retired)
})

test("预设的每个模型在官方端点上都有快照单价，不会显示价格未知", () => {
  const preset = presetFor("deepseek")
  for (const model of preset.models) {
    const cost = estimateRunCost({
      usage: { inputTokens: 1_000_000, outputTokens: 1_000_000 },
      providerKind: "deepseek",
      modelId: model.id,
      baseURL: preset.endpoints.openai,
      snapshot: PRICE_SNAPSHOT
    })
    assert.equal(cost.status, "estimated", model.id)
  }
})

test("替代名都在预设里，且不会再被映射（迁移幂等的前提）", () => {
  const presetIds = new Set(presetFor("deepseek").models.map((m) => m.id))
  for (const target of Object.values(DEEPSEEK_RETIRED_MODEL_IDS)) {
    assert.ok(presetIds.has(target), target)
    assert.equal(Object.hasOwn(DEEPSEEK_RETIRED_MODEL_IDS, target), false, target)
  }
})

test("官方端点：目录里的停用名换成 deepseek-flash 并去重，选中的模型也换掉", () => {
  const { profile, changed } = migrateStoredProfile(stored({ fastModelId: "deepseek-v4-flash", reasoningModelId: "deepseek-reasoner" }))
  assert.equal(changed, true)
  assert.deepEqual(ids(profile), ["deepseek-flash", "deepseek-v4-pro"])
  assert.equal(profile.models?.[0]?.label, "DeepSeek Flash")
  assert.equal(profile.models?.[0]?.source, "preset")
  assert.equal(profile.modelId, "deepseek-flash")
  assert.equal(profile.fastModelId, "deepseek-flash")
  assert.equal(profile.reasoningModelId, "deepseek-flash")
})

test("官方端点：迁移后的选中模型能按快照算出价格", () => {
  const { profile } = migrateStoredProfile(stored())
  const cost = estimateRunCost({
    usage: { inputTokens: 1000, outputTokens: 1000 },
    providerKind: profile.kind,
    modelId: profile.modelId,
    baseURL: profile.baseURL
  })
  assert.equal(cost.status, "estimated")
})

test("官方端点：跑第二次没有任何变化（changed=false，内容相同）", () => {
  const { first, second } = twice(stored())
  assert.equal(first.changed, true)
  assert.equal(second.changed, false)
  assert.deepEqual(second.profile, first.profile)
})

test("官方端点：用户手动加的模型保留，包括手动加的停用名本身", () => {
  const { profile } = migrateStoredProfile(
    stored({
      modelId: "deepseek-chat",
      models: [
        { id: "deepseek-chat", label: "my chat", enabled: true, source: "manual" },
        { id: "my-finetune", label: "mine", enabled: true, source: "manual" },
        { id: "deepseek-reasoner", label: "DeepSeek Reasoner", enabled: true, source: "preset" }
      ]
    })
  )
  assert.deepEqual(ids(profile), ["deepseek-chat", "my-finetune", "deepseek-flash"])
  assert.equal(profile.models?.[0]?.label, "my chat")
  assert.equal(profile.models?.[1]?.source, "manual")
  assert.equal(profile.modelId, "deepseek-chat")
})

test("官方端点：选中的是用户自己的模型时不动", () => {
  const { profile } = migrateStoredProfile(
    stored({ modelId: "my-finetune", models: [{ id: "my-finetune", label: "mine", enabled: true, source: "manual" }] })
  )
  assert.equal(profile.modelId, "my-finetune")
  assert.deepEqual(ids(profile), ["my-finetune"])
})

test("官方端点：已有 deepseek-flash（关着）时合并停用项，不重复，开着的状态带过来", () => {
  const { profile } = migrateStoredProfile(
    stored({
      models: [
        { id: "deepseek-chat", label: "DeepSeek Chat (legacy)", enabled: true, source: "preset" },
        { id: "deepseek-flash", label: "DeepSeek Flash", enabled: false, source: "remote", contextWindow: 1_048_576 }
      ]
    })
  )
  assert.deepEqual(ids(profile), ["deepseek-flash"])
  assert.equal(profile.models?.[0]?.enabled, true)
  assert.equal(profile.models?.[0]?.source, "remote")
  assert.equal(profile.models?.[0]?.contextWindow, 1_048_576)
})

test("官方端点：老档案只有 baseURL、模型没有 source 字段也会迁移", () => {
  const { profile } = migrateStoredProfile({
    id: "prv_old",
    name: "old",
    kind: "deepseek",
    baseURL: "https://api.deepseek.com/v1",
    apiStyle: "openai",
    apiKey: "sk-old",
    modelId: "deepseek-reasoner",
    models: [{ id: "deepseek-chat", label: "deepseek-chat" }]
  })
  assert.deepEqual(ids(profile), ["deepseek-flash"])
  assert.equal(profile.models?.[0]?.source, "preset")
  assert.equal(profile.modelId, "deepseek-flash")
})

const UNTOUCHED: Record<string, Partial<LooseProfile>> = {
  "http 协议": { endpoints: { openai: "http://api.deepseek.com/v1" } },
  "子域": { endpoints: { openai: "https://eu.api.deepseek.com/v1" } },
  "后缀仿冒": { endpoints: { openai: "https://api.deepseek.com.evil.example/v1" } },
  "主机末尾点": { endpoints: { openai: "https://api.deepseek.com./v1" } },
  "非默认端口": { endpoints: { openai: "https://api.deepseek.com:8443/v1" } },
  "带用户名密码": { endpoints: { openai: "https://u:p@api.deepseek.com/v1" } },
  "中转地址": { endpoints: { openai: "https://relay.example.cn/v1" } },
  "官方 + 中转混合": { endpoints: { openai: "https://api.deepseek.com/v1", anthropic: "https://relay.example.cn/anthropic" } },
  "没有端点": { endpoints: {} },
  "custom kind 指向官方地址": { kind: "custom" }
}

for (const [name, over] of Object.entries(UNTOUCHED)) {
  test(`不迁移：${name}，模型 id 和选中模型原样`, () => {
    const raw = stored(over)
    const { profile } = migrateStoredProfile(raw)
    assert.deepEqual(ids(profile), raw.models?.map((m) => m.id))
    assert.equal(profile.modelId, "deepseek-chat")
  })
}

test("不迁移的档案跑两次也没有变化", () => {
  const { second } = twice(stored({ endpoints: { openai: "https://relay.example.cn/v1" } }))
  assert.equal(second.changed, false)
  assert.equal(second.profile.modelId, "deepseek-chat")
})

test("官方端点：主机大小写、末尾斜杠、显式 443 仍算官方", () => {
  assert.equal(isOfficialDeepseekEndpointUrl("https://API.DeepSeek.com/"), true)
  assert.equal(isOfficialDeepseekEndpointUrl("https://api.deepseek.com:443/v1"), true)
  assert.equal(isOfficialDeepseekEndpointUrl("https://api.deepseek.com"), true)
  assert.equal(isOfficialDeepseekEndpointUrl("api.deepseek.com"), false)
  assert.equal(isOfficialDeepseekEndpointUrl(""), false)
})

test("normalizeVault：官方档案迁移、中转档案不动，第二次读档 changed=false", () => {
  const vault = {
    activeId: "prv_ds",
    profiles: [stored(), stored({ id: "prv_relay", endpoints: { openai: "https://relay.example.cn/v1" } })]
  }
  const first = normalizeVault(vault)
  assert.equal(first.changed, true)
  assert.equal(first.vault.profiles[0]?.modelId, "deepseek-flash")
  assert.equal(first.vault.profiles[1]?.modelId, "deepseek-chat")
  const second = normalizeVault(JSON.parse(JSON.stringify(first.vault)))
  assert.equal(second.changed, false)
  assert.deepEqual(second.vault, first.vault)
})

test("读档入口接上了迁移（源码守卫）", () => {
  const src = readFileSync(new URL("./profile-migrate.ts", import.meta.url), "utf8")
  assert.match(src, /const retired = migrateRetiredDeepseekProfile\(stored, kind, endpoints, labelFor\)\r?\n\s*const raw = retired\.raw\r?\n/)
})
