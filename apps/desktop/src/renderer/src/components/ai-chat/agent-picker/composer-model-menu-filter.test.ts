/**
 * Composer 模型菜单：搜索门槛、当前分组提前、跨供应商过滤。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  filterGroupedModels,
  modelsInProvider,
  needsProviderMenu,
  promoteCurrentGroup,
  providerKeyForModel,
  type MenuGroup
} from "./composer-model-menu-filter.ts"

const groups: MenuGroup[] = [
  { key: "grok", providerName: "grok", models: [{ id: "grok-4", label: "grok-4" }] },
  {
    key: "deep",
    providerName: "deep",
    models: [
      { id: "deepseek-flash", label: "deepseek-flash" },
      { id: "deepseek-v4-pro", label: "deepseek-v4-pro" }
    ]
  }
]

test("当前模型的供应商分组排到最前", () => {
  const next = promoteCurrentGroup(groups, "deepseek-v4-pro")
  assert.equal(next[0]?.key, "deep")
  assert.equal(next[1]?.key, "grok")
})

test("两家及以上才出供应商下拉", () => {
  assert.equal(needsProviderMenu(1), false)
  assert.equal(needsProviderMenu(2), true)
})

test("名单只留选中的供应商", () => {
  assert.equal(providerKeyForModel(groups, "grok-4"), "grok")
  const next = modelsInProvider(groups, "deep", "v4")
  assert.deepEqual(next.map((group) => group.key), ["deep"])
  assert.deepEqual(next[0]?.models.map((model) => model.id), ["deepseek-v4-pro"])
})

test("搜索能跨分组匹配 id", () => {
  const next = filterGroupedModels(groups, "v4")
  assert.deepEqual(next.map((group) => group.key), ["deep"])
  assert.deepEqual(next[0]?.models.map((model) => model.id), ["deepseek-v4-pro"])
})
