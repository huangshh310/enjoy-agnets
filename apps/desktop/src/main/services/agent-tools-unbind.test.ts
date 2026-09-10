import assert from "node:assert/strict"
import { test } from "node:test"
import { unbindProviderInOverrides } from "./agent-tools-unbind.ts"

test("删除档案清 providerId / useCustomProvider，其它 CLI 不动", () => {
  const { next, changed } = unbindProviderInOverrides(
    {
      claude: { providerId: "prv_1", useCustomProvider: true, modelId: "sonnet" },
      codex: { providerId: "prv_1", useCustomProvider: true },
      cursor: { enabled: true, providerId: "prv_2", useCustomProvider: true }
    },
    "prv_1"
  )
  assert.equal(changed, true)
  assert.equal(next.claude.providerId, undefined)
  assert.equal(next.claude.useCustomProvider, false)
  assert.equal(next.claude.modelId, undefined)
  assert.equal(next.codex.useCustomProvider, false)
  assert.equal(next.cursor.providerId, "prv_2")
})

test("没有引用则不改写", () => {
  const all = { claude: { enabled: true } }
  const { next, changed } = unbindProviderInOverrides(all, "prv_missing")
  assert.equal(changed, false)
  assert.equal(next, all)
})
