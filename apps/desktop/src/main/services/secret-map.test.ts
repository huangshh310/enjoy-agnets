import assert from "node:assert/strict"
import { test } from "node:test"
import {
  mergeJsonSecrets,
  mergeKeptSecrets,
  redactJsonSecrets,
  redactSecretMap
} from "./secret-map.ts"

test("空值保留已存密钥，删键即删除", () => {
  const merged = mergeKeptSecrets(
    { TOKEN: "", KEPT: "", NEW: "n" },
    { TOKEN: "secret", KEPT: "old", DROP: "x" }
  )
  assert.equal(merged.TOKEN, "secret")
  assert.equal(merged.KEPT, "old")
  assert.equal(merged.NEW, "n")
  assert.equal(merged.DROP, undefined)
})

test("incoming 缺席则整表保留", () => {
  assert.deepEqual(mergeKeptSecrets(undefined, { A: "1" }), { A: "1" })
})

test("脱敏只留键", () => {
  assert.deepEqual(redactSecretMap({ TOKEN: "secret" }), { TOKEN: "" })
  assert.equal(redactJsonSecrets(`{"Authorization":"Bearer abc"}`), `{"Authorization":""}`)
})

test("JSON 空值合并保留旧头", () => {
  const next = mergeJsonSecrets(`{"Authorization":"","X-New":"1"}`, `{"Authorization":"Bearer old"}`)
  assert.equal(next, JSON.stringify({ Authorization: "Bearer old", "X-New": "1" }))
  assert.equal(mergeJsonSecrets("", `{"A":"1"}`), `{"A":"1"}`)
})
