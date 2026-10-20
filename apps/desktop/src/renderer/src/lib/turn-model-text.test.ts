import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { isCliPlaceholderModelId, turnModelText } from "./turn-model-text.ts"

const tools = [
  { id: "amp", label: "Amp", models: [] },
  { id: "claude", label: "Claude Code", models: [{ id: "sonnet", label: "Sonnet 4.5" }] }
]
const base = { enjoyLocalLabel: "Enjoy 本地", unknownEngineLabel: "模型服务", catalog: [{ id: "gpt-x", label: "GPT X" }], tools }

test("luna P3：没选模型的 Amp 回复（modelId=cli:amp），底脚只显示「Amp」，不露 cli:amp", () => {
  const text = turnModelText({ ...base, runtimeId: "amp", modelId: "cli:amp" })
  assert.equal(text, "Amp")
  assert.ok(!text!.includes("cli:"))
})

test("占位也可能被 stamp 进 modelLabel：同样当没有模型", () => {
  assert.equal(turnModelText({ ...base, runtimeId: "amp", modelId: "cli:amp", modelLabel: "cli:amp" }), "Amp")
})

test("切回后引擎列表还没到：用记住的引擎名，仍不带 cli:", () => {
  const text = turnModelText({
    ...base,
    tools: [],
    runtimeId: "amp",
    modelId: "cli:amp",
    rememberedToolLabel: (id) => (id === "amp" ? "Amp" : undefined)
  })
  assert.equal(text, "Amp")
})

test("真选了模型的照旧显示「引擎 · 模型」", () => {
  assert.equal(turnModelText({ ...base, runtimeId: "claude", modelId: "sonnet" }), "Claude Code · Sonnet 4.5")
  assert.equal(turnModelText({ ...base, runtimeId: "enjoy-local", modelId: "gpt-x" }), "Enjoy 本地 · GPT X")
  assert.equal(turnModelText({ ...base, runtimeId: "amp", modelId: "cli:amp", modelLabel: "Smart" }), "Amp · Smart")
})

test("isCliPlaceholderModelId 只认 cli: 前缀", () => {
  assert.equal(isCliPlaceholderModelId("cli:amp"), true)
  assert.equal(isCliPlaceholderModelId("gpt-4o"), false)
  assert.equal(isCliPlaceholderModelId(undefined), false)
})

test("底脚组件走 turnModelText（源码正则）", () => {
  const src = readFileSync(new URL("../components/ai-chat/thread/turns/turn-model-label.tsx", import.meta.url), "utf8")
  assert.match(src, /turnModelText\(/)
  assert.ok(!/message\.modelId\)\s*$/m.test(src))
})

test("引擎认不出来（不在列表、也没记住）：底脚写「模型服务」，不露原始 runtimeId（leo #164 软 c）", () => {
  assert.equal(turnModelText({ ...base, runtimeId: "custom:acp_7f3a", modelId: "cli:x" }), "模型服务")
  assert.equal(turnModelText({ ...base, runtimeId: "custom:acp_7f3a", modelId: "gpt-x" }), "模型服务 · GPT X")
  assert.equal(
    turnModelText({ ...base, runtimeId: "custom:acp_7f3a", modelId: "cli:x", rememberedToolLabel: () => "老助手" }),
    "老助手"
  )
})
