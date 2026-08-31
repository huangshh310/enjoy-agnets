import assert from "node:assert/strict"
import { test } from "node:test"
import { modelFamilyOf, providerRefCacheKey } from "./provider-refs.ts"

test("modelFamilyOf 取模型族前缀", () => {
  assert.equal(modelFamilyOf("gpt-4o"), "gpt")
  assert.equal(modelFamilyOf("openai/gpt-4o"), "openai")
})

test("providerRefCacheKey 稳定可复用", () => {
  const key = providerRefCacheKey({
    providerId: "openai",
    modelFamily: "gpt",
    fileHash: "abc"
  })
  assert.equal(key, "openai:gpt:abc:default")
})
