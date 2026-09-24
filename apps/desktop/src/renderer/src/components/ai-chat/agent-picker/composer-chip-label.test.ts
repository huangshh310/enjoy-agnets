import assert from "node:assert/strict"
import { test } from "node:test"
import {
  composerActiveModelId,
  composerActiveModelLabel,
  composerBoundProviderLabel,
  composerChipParts,
  composerChipText
} from "./composer-chip-label.ts"
import { inspectorContextModel } from "../right-pane/views/context/inspector-context-model.ts"

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

test("ACP 会话覆盖优先于引擎默认 selectedModel", () => {
  const label = composerActiveModelLabel({
    runtimeId: "claude",
    catalogLabel: "Sonnet 4",
    catalogId: "sonnet",
    sessionModelId: "opus",
    agent: {
      label: "Claude",
      selectedModel: "sonnet",
      models: [
        { id: "sonnet", label: "Sonnet 4" },
        { id: "opus", label: "Opus 4.1" }
      ]
    }
  })
  assert.equal(label, "Opus 4.1")
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
  assert.equal(
    composerActiveModelId({
      runtimeId: "grok",
      catalogLabel: "deepseek-v4-flash",
      catalogId: "deepseek-v4-flash",
      agent: { selectedModel: "grok-4.6" }
    }),
    "grok-4.6"
  )
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
  const pending = inspectorContextModel({
    phase: "handoff_pending",
    toRuntimeId: "claude",
    runtimeId: "enjoy-local",
    catalogId: "deepseek-flash",
    catalogLabel: "deepseek-flash",
    agents: [{ id: "claude", label: "Claude Code", selectedModel: "claude-sonnet-4-5" }]
  })
  assert.equal(pending.id, "claude-sonnet-4-5")
  assert.equal(pending.label, "claude-sonnet-4-5")
})

test("上一引擎的 deepseek 覆盖不会粘到没有这个 id 的 Claude", () => {
  const face = {
    runtimeId: "claude",
    catalogLabel: "deepseek-flash",
    catalogId: "deepseek-flash",
    sessionModelId: "deepseek-flash",
    agent: {
      label: "Claude Code",
      selectedModel: "claude-sonnet-4-5",
      models: [{ id: "claude-sonnet-4-5", label: "Sonnet 4.5" }]
    }
  }
  assert.equal(composerActiveModelId(face), "claude-sonnet-4-5")
  assert.equal(composerActiveModelLabel(face), "Sonnet 4.5")
})

test("Claude 名单已到但是空时，不再粘着上一引擎的 deepseek", () => {
  const id = composerActiveModelId({
    runtimeId: "claude",
    catalogLabel: "deepseek-flash",
    catalogId: "deepseek-flash",
    sessionModelId: "deepseek-flash",
    agent: { selectedModel: "claude-sonnet-4-5", models: [] }
  })
  assert.equal(id, "claude-sonnet-4-5")
})

test("Claude 名单里有 deepseek-flash 时会话覆盖仍然生效", () => {
  const id = composerActiveModelId({
    runtimeId: "claude",
    catalogLabel: "deepseek-flash",
    catalogId: "deepseek-flash",
    sessionModelId: "deepseek-flash",
    agent: {
      selectedModel: "claude-sonnet-4-5",
      models: [
        { id: "claude-sonnet-4-5", label: "Sonnet 4.5" },
        { id: "deepseek-flash", label: "deepseek-flash" }
      ]
    }
  })
  assert.equal(id, "deepseek-flash")
})

test("显示名人话上芯片，不把未命名当引擎", () => {
  const named = composerChipParts({
    engineLabel: "代码审",
    modelLabel: "Sonnet 4"
  })
  assert.equal(composerChipText(named), "代码审 · Sonnet 4")
  const fallback = composerChipParts({
    engineLabel: "Claude Code",
    modelLabel: "Sonnet 4"
  })
  assert.equal(composerChipText(fallback), "Claude Code · Sonnet 4")
  assert.ok(!composerChipText(fallback).includes("未命名"))
})

test("绑定档案时模型用 vault 所选，档案名只进 title", () => {
  const label = composerActiveModelLabel({
    runtimeId: "codex",
    catalogLabel: "gpt-5.4",
    catalogId: "gpt-5.4",
    agent: {
      label: "Codex CLI",
      useCustomProvider: true,
      boundProviderName: "lucky0625",
      selectedModel: "hy3",
      models: [{ id: "hy3", label: "hy3" }]
    }
  })
  assert.equal(label, "hy3")
  assert.equal(
    composerBoundProviderLabel({ useCustomProvider: true, boundProviderName: "lucky0625" }),
    "lucky0625"
  )
  const parts = composerChipParts({
    engineLabel: "Codex CLI",
    modelLabel: label,
    providerLabel: "lucky0625"
  })
  assert.equal(composerChipText(parts), "Codex CLI · hy3")
  assert.equal(parts.title, "Codex CLI · lucky0625 · hy3")
})
