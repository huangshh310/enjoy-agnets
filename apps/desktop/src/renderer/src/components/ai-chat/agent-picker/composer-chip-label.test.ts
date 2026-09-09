import assert from "node:assert/strict"
import { test } from "node:test"
import { composerChipParts, composerChipText } from "./composer-chip-label.ts"

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
