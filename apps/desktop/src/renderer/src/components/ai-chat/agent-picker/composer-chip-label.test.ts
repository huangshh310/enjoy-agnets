import assert from "node:assert/strict"
import { test } from "node:test"
import { composerActiveModelLabel, composerChipParts, composerChipText } from "./composer-chip-label.ts"

test("胶囊只有引擎 · 模型，供应商只进 title", () => {
  const parts = composerChipParts({
    engineLabel: "Enjoy 本地",
    modelLabel: "deepseek-chat",
    providerLabel: "DeepSeek"
  })
  assert.equal(composerChipText(parts), "Enjoy 本地 · deepseek-chat")
  assert.equal(parts.title, "Enjoy 本地 · DeepSeek · deepseek-chat")
  assert.ok(!parts.engine.includes("DeepSeek"))
})

test("CLI 引擎同样两段，不拼协议词", () => {
  const parts = composerChipParts({
    engineLabel: "Oh My Pi",
    modelLabel: "gpt-5"
  })
  assert.equal(composerChipText(parts), "Oh My Pi · gpt-5")
  assert.equal(parts.title, "Oh My Pi · gpt-5")
})

test("供应商不会变成胶囊第三段", () => {
  const text = composerChipText(
    composerChipParts({
      engineLabel: "Enjoy 本地",
      modelLabel: "claude-sonnet",
      providerLabel: "Anthropic"
    })
  )
  assert.equal(text.split(" · ").length, 2)
  assert.ok(!text.includes("Anthropic"))
})

test("ACP 审查条不用 Enjoy Local 档案模型名", () => {
  const grok = composerActiveModelLabel({
    runtimeId: "grok",
    catalogLabel: "deepseek-v4-flash",
    catalogId: "deepseek-v4-flash",
    agent: {
      label: "Grok Build",
      selectedModel: "grok-4.6",
      models: [{ id: "grok-4.6", label: "grok-4.6" }]
    }
  })
  assert.equal(grok, "grok-4.6")
  const local = composerActiveModelLabel({
    runtimeId: "enjoy-local",
    catalogLabel: "deepseek-v4-flash",
    catalogId: "ds"
  })
  assert.equal(local, "deepseek-v4-flash")
  const fallback = composerActiveModelLabel({
    runtimeId: "grok",
    catalogLabel: "deepseek-v4-flash",
    catalogId: "ds",
    agent: { label: "Grok Build", models: [] }
  })
  assert.equal(fallback, "Grok Build")
})
