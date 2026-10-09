import assert from "node:assert/strict"
import { test } from "node:test"
import { catalogApiMatchesPreset, hostOf } from "./catalog-site.ts"
import { kindFromModelsDevProvider, uniqueCatalogForKind } from "./models-dev-kind.ts"
import { PRICE_SNAPSHOT } from "./snapshot.ts"
import { presetFor } from "../presets.ts"

/** models.dev 带 api 的目录：必须和 preset 同站。没有 api 的用 preset 主机自检。 */
const CATALOG_API: Record<string, string | undefined> = {
  "siliconflow-cn": "https://api.siliconflow.cn/v1",
  openrouter: "https://openrouter.ai/api/v1",
  modelscope: "https://api-inference.modelscope.cn/v1",
  deepseek: "https://api.deepseek.com",
  togetherai: undefined,
  aihubmix: undefined,
  openai: undefined,
  anthropic: undefined,
  google: undefined,
  groq: undefined,
  mistral: undefined,
  xai: undefined,
  perplexity: undefined,
  cohere: undefined
}

test("快照 catalog 与 preset 同站；国际站 siliconflow 已撤", () => {
  const catalogs = new Set(PRICE_SNAPSHOT.models.map((model) => model.provider))
  assert.equal(catalogs.has("siliconflow"), false)
  assert.equal(uniqueCatalogForKind("siliconflow"), "siliconflow-cn")
  for (const catalog of catalogs) {
    const kind = kindFromModelsDevProvider(catalog) ?? catalog
    const api = CATALOG_API[catalog]
    assert.equal(catalog in CATALOG_API, true, `unexpected catalog ${catalog}`)
    assert.equal(catalogApiMatchesPreset(kind, api), true, `${catalog} site mismatch`)
    assert.ok(hostOf(presetFor(kind).defaultBaseURL))
  }
})
