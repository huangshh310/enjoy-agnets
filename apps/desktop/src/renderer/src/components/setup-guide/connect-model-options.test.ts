/**
 * 向导「连一个模型」只按真实检测露出选项。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { buildChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { connectModelOptions, connectModelRowHintKey } from "./connect-model-options.ts"

test("全新安装只露添加密钥和以后再连，两行等权", () => {
  const options = connectModelOptions(
    buildChatReadiness({ engines: [], localModels: [], apiKeys: [], engineCount: 1 })
  )
  assert.deepEqual(
    options.map((item) => item.kind),
    ["api_key", "later"]
  )
  assert.equal(options[0] && "recommended" in options[0] && options[0].recommended, false)
})

test("已登录引擎和本机模型按探测露出，推荐第一条引擎", () => {
  const options = connectModelOptions(
    buildChatReadiness({
      engines: [{ kind: "engine", runtimeId: "claude", name: "Claude Code" }],
      localModels: [{ kind: "local_model", service: "ollama" }],
      apiKeys: [],
      engineCount: 2
    })
  )
  assert.deepEqual(
    options.map((item) => item.kind),
    ["engine", "local_model", "api_key", "later"]
  )
  assert.equal(options[0]?.kind === "engine" && options[0].recommended, true)
  assert.equal(options[1]?.kind === "local_model" && options[1].recommended, false)
})

test("已有 API 密钥时该行标已连上，不推荐再添加", () => {
  const options = connectModelOptions(
    buildChatReadiness({
      engines: [],
      localModels: [],
      apiKeys: [{ kind: "api_key", providerId: "p1", presetId: "openai" }],
      engineCount: 0
    })
  )
  const key = options.find((item) => item.kind === "api_key")
  assert.equal(key?.kind === "api_key" && key.connected, true)
  assert.equal(key?.kind === "api_key" && key.recommended, false)
})

test("没有快照时仍露出始终可点的两行", () => {
  assert.deepEqual(
    connectModelOptions(undefined).map((item) => item.kind),
    ["api_key", "later"]
  )
})

test("远端未验证本机模型露出「未验证」，不推荐、不占就绪槽", () => {
  const options = connectModelOptions(
    buildChatReadiness({
      engines: [],
      localModels: [{ kind: "local_model", service: "ollama", verified: false }],
      apiKeys: [],
      engineCount: 1
    })
  )
  const local = options.find((item) => item.kind === "local_model")
  assert.equal(local?.kind === "local_model" && local.verified, false)
  assert.equal(local?.kind === "local_model" && local.recommended, false)
  assert.equal(connectModelRowHintKey(local!), "settings.setupGuide.connectLocalUnverifiedWhy")
  const key = options.find((item) => item.kind === "api_key")
  assert.equal(key?.kind === "api_key" && key.recommended, true)
})

test("已验证本机模型才推荐，hint 不是未验证", () => {
  const options = connectModelOptions(
    buildChatReadiness({
      engines: [],
      localModels: [{ kind: "local_model", service: "ollama", verified: true }],
      apiKeys: [],
      engineCount: 1
    })
  )
  const local = options.find((item) => item.kind === "local_model")
  assert.equal(local?.kind === "local_model" && local.verified, true)
  assert.equal(local?.kind === "local_model" && local.recommended, true)
  assert.equal(connectModelRowHintKey(local!), "settings.setupGuide.connectLocalHint")
})
