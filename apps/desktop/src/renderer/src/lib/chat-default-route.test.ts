import assert from "node:assert/strict"
import { test } from "node:test"
import {
  knownReadinessFields,
  pickModelForDefaultRoute,
  runtimeIdFromDefaultRoute,
  shouldApplyDefaultRoute,
  takeDefaultRoute
} from "./chat-default-route.ts"

test("抽出 defaultRoute，不把多余字段留给 .strict()", () => {
  const fields = knownReadinessFields({
    ready: true,
    engineCount: 1,
    engines: [],
    localModels: [],
    apiKeys: [],
    defaultRoute: { kind: "api_key", providerId: "p1", presetId: "deepseek" }
  })
  assert.equal(fields && "defaultRoute" in fields, false)
  assert.equal(fields?.ready, true)
})

test("认引擎 / 本机 / 密钥三条 defaultRoute，也认裸 runtimeId", () => {
  assert.deepEqual(takeDefaultRoute({ kind: "engine", runtimeId: "claude", name: "Claude" }), {
    kind: "engine",
    runtimeId: "claude",
    name: "Claude"
  })
  assert.deepEqual(takeDefaultRoute({ kind: "local_model", service: "ollama", verified: false }), {
    kind: "local_model",
    service: "ollama",
    verified: false
  })
  assert.deepEqual(takeDefaultRoute({ kind: "api_key", providerId: "p1", presetId: "openai" }), {
    kind: "api_key",
    providerId: "p1",
    presetId: "openai"
  })
  assert.equal(takeDefaultRoute("cursor")?.kind === "engine" && takeDefaultRoute("cursor")?.runtimeId, "cursor")
  assert.equal(takeDefaultRoute({ kind: "mystery" }), undefined)
})

test("显式选择或会话绑定都不覆盖", () => {
  assert.equal(shouldApplyDefaultRoute({ explicitRuntime: false, sessionBound: false }), true)
  assert.equal(shouldApplyDefaultRoute({ explicitRuntime: true, sessionBound: false }), false)
  assert.equal(shouldApplyDefaultRoute({ explicitRuntime: false, sessionBound: true }), false)
})

test("defaultRoute 映射到 runtime 与模型芯片", () => {
  assert.equal(runtimeIdFromDefaultRoute({ kind: "engine", runtimeId: "claude", name: "Claude" }), "claude")
  assert.equal(
    runtimeIdFromDefaultRoute({ kind: "api_key", providerId: "p1", presetId: "deepseek" }),
    "enjoy-local"
  )
  const models = [
    { id: "flash", provider: "deepseek", providerId: "p1" },
    { id: "llama", provider: "ollama" }
  ]
  assert.equal(
    pickModelForDefaultRoute({ kind: "api_key", providerId: "p1", presetId: "deepseek" }, models)?.id,
    "flash"
  )
  assert.equal(
    pickModelForDefaultRoute({ kind: "local_model", service: "ollama" }, models)?.id,
    "llama"
  )
})
