/**
 * 用户现象：添加 Anthropic 填了 api.deepseek.com/anthropic，被误判成 Chat Completions。
 * cc-switch Claude 预设：ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic，/models 在根上。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  adviseCatalogUrl,
  catalogBaseCandidates,
  catalogPersistBase,
  CatalogError,
  resolveCatalogBaseURL
} from "./catalog-url.ts"

const DEEPSEEK_ANTHROPIC = "https://api.deepseek.com/anthropic"
const DEEPSEEK_CHAT = "https://api.deepseek.com/v1"

test("Anthropic + DeepSeek 控制台：改成官方 Messages 路径，不要去打网页", () => {
  const advice = adviseCatalogUrl("https://platform.deepseek.com", "anthropic")
  assert.deepEqual(advice, { action: "rewrite", rewriteTo: DEEPSEEK_ANTHROPIC })
  assert.equal(resolveCatalogBaseURL("https://platform.deepseek.com", "anthropic"), DEEPSEEK_ANTHROPIC)
})

test("Chat Completions + DeepSeek 控制台：改成 API 地址再拉", () => {
  const advice = adviseCatalogUrl("https://platform.deepseek.com", "openai")
  assert.deepEqual(advice, { action: "rewrite", rewriteTo: DEEPSEEK_CHAT })
  assert.equal(resolveCatalogBaseURL("https://platform.deepseek.com", "openai"), DEEPSEEK_CHAT)
})

test("Anthropic + DeepSeek 官方 /anthropic：就是 Messages，放行", () => {
  assert.equal(adviseCatalogUrl(DEEPSEEK_ANTHROPIC, "anthropic").action, "ok")
  assert.equal(adviseCatalogUrl(`${DEEPSEEK_ANTHROPIC}/`, "anthropic").action, "ok")
  assert.equal(adviseCatalogUrl(`${DEEPSEEK_ANTHROPIC}/v1`, "anthropic").action, "ok")
  assert.equal(resolveCatalogBaseURL(DEEPSEEK_ANTHROPIC, "anthropic"), DEEPSEEK_ANTHROPIC)
})

test("Anthropic + DeepSeek Chat 根：改写到 /anthropic，不要拒", () => {
  assert.deepEqual(adviseCatalogUrl(DEEPSEEK_CHAT, "anthropic"), {
    action: "rewrite",
    rewriteTo: DEEPSEEK_ANTHROPIC
  })
  assert.deepEqual(adviseCatalogUrl("https://api.deepseek.com", "anthropic"), {
    action: "rewrite",
    rewriteTo: DEEPSEEK_ANTHROPIC
  })
})

test("Chat Completions + DeepSeek /anthropic：改回 /v1", () => {
  assert.deepEqual(adviseCatalogUrl(DEEPSEEK_ANTHROPIC, "openai"), {
    action: "rewrite",
    rewriteTo: DEEPSEEK_CHAT
  })
})

test("Anthropic 官方地址放行", () => {
  assert.equal(adviseCatalogUrl("https://api.anthropic.com", "anthropic").action, "ok")
  assert.equal(adviseCatalogUrl("https://api.anthropic.com/v1", "anthropic").action, "ok")
})

test("自定义中转域名不误伤", () => {
  assert.equal(adviseCatalogUrl("https://api.lucky.example/v1", "anthropic").action, "ok")
  assert.equal(adviseCatalogUrl("https://open.bigmodel.cn/api/anthropic", "anthropic").action, "ok")
})

test("OpenAI 官方主机没有 Messages 线，仍拒", () => {
  const advice = adviseCatalogUrl("https://api.openai.com/v1", "anthropic")
  assert.equal(advice.action, "reject")
  if (advice.action !== "reject") return
  assert.equal(advice.code, "catalogProtocol")
})

test("拉模型前抛 CatalogError，对上截图里的拉取失败，不打网页", () => {
  assert.throws(
    () => resolveCatalogBaseURL("https://chatgpt.com", "anthropic"),
    (error: unknown) => {
      assert.ok(error instanceof CatalogError)
      assert.equal(error.code, "catalogConsoleProtocol")
      return true
    }
  )
})

test("DeepSeek /anthropic 拉模型：候选含根上 /models，不覆盖 Messages 基址", () => {
  assert.deepEqual(catalogBaseCandidates(DEEPSEEK_ANTHROPIC), [
    DEEPSEEK_ANTHROPIC,
    `${DEEPSEEK_ANTHROPIC}/v1`,
    DEEPSEEK_CHAT,
    "https://api.deepseek.com"
  ])
  assert.equal(catalogPersistBase(DEEPSEEK_ANTHROPIC, "https://api.deepseek.com"), DEEPSEEK_ANTHROPIC)
  assert.equal(catalogPersistBase(DEEPSEEK_ANTHROPIC, DEEPSEEK_CHAT), DEEPSEEK_ANTHROPIC)
  assert.equal(catalogPersistBase("https://api.deepseek.com", DEEPSEEK_CHAT), DEEPSEEK_CHAT)
})
