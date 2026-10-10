import assert from "node:assert/strict"
import { test } from "node:test"
import { findProviderForEdit, providerEditSearch } from "./open-provider-edit.ts"

test("改密钥深链带 edit + focus=key", () => {
  assert.deepEqual(providerEditSearch("prv_1"), { edit: "prv_1", focus: "key" })
})

test("深链 id 对不上时落到 active+hasKey", () => {
  const providers = [
    { id: "prv_1", name: "E2E Stub Key", active: true, hasKey: true, enabled: true }
  ]
  assert.equal(findProviderForEdit(providers, "e2e")?.id, "prv_1")
  assert.equal(findProviderForEdit(providers, "prv_1")?.id, "prv_1")
  assert.equal(findProviderForEdit([], "e2e"), undefined)
})
