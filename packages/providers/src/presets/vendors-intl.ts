/**
 * 国际厂商预设。端点按 Magpie presets.go 当时的官方根，Google 仍走原生主机。
 */
import { definePreset, presetModel, type ProviderPreset } from "./define.ts"

export const INTL_VENDOR_PRESETS: ProviderPreset[] = [
  definePreset({
    kind: "deepseek",
    name: "DeepSeek",
    description: "Official DeepSeek Chat and Reasoner models. Chat, Responses, and Anthropic Messages.",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://api-docs.deepseek.com/",
    keysURL: "https://platform.deepseek.com/api_keys",
    endpoints: {
      openai: "https://api.deepseek.com/v1",
      "openai-responses": "https://api.deepseek.com/v1",
      anthropic: "https://api.deepseek.com/anthropic"
    },
    models: [
      presetModel("deepseek-v4-flash", "DeepSeek V4 Flash"),
      presetModel("deepseek-v4-pro", "DeepSeek V4 Pro"),
      presetModel("deepseek-chat", "DeepSeek Chat (legacy)"),
      presetModel("deepseek-reasoner", "DeepSeek Reasoner")
    ]
  }),
  definePreset({
    kind: "openai",
    name: "OpenAI",
    description: "Official OpenAI API, supporting Chat Completions and Responses API.",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://platform.openai.com/docs",
    keysURL: "https://platform.openai.com/api-keys",
    endpoints: {
      openai: "https://api.openai.com/v1",
      "openai-responses": "https://api.openai.com/v1"
    },
    models: [
      presetModel("gpt-4.1", "GPT-4.1"),
      presetModel("gpt-4.1-mini", "GPT-4.1 Mini"),
      presetModel("gpt-4o", "GPT-4o")
    ]
  }),
  definePreset({
    kind: "anthropic",
    name: "Anthropic",
    description: "Claude Messages API.",
    group: "vendor",
    apiStyle: "anthropic",
    requiresKey: true,
    docsURL: "https://docs.anthropic.com/",
    keysURL: "https://console.anthropic.com/settings/keys",
    headerHints: ["anthropic-workspace-id"],
    endpoints: { anthropic: "https://api.anthropic.com" },
    models: [
      presetModel("claude-sonnet-4-5", "Claude Sonnet 4.5"),
      presetModel("claude-opus-4", "Claude Opus 4")
    ]
  }),
  definePreset({
    kind: "google",
    name: "Google Gemini",
    description: "Official Gemini API. Requests stay on the native SDK host.",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://ai.google.dev/gemini-api/docs",
    keysURL: "https://aistudio.google.com/apikey",
    endpoints: { openai: "https://generativelanguage.googleapis.com/v1beta" },
    models: [
      presetModel("gemini-2.5-flash", "Gemini 2.5 Flash"),
      presetModel("gemini-2.5-pro", "Gemini 2.5 Pro")
    ]
  }),
  definePreset({
    kind: "xai",
    name: "xAI (Grok)",
    description: "xAI official API. Chat, Responses, and Anthropic Messages.",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://docs.x.ai/",
    keysURL: "https://console.x.ai",
    endpoints: {
      openai: "https://api.x.ai/v1",
      "openai-responses": "https://api.x.ai/v1",
      anthropic: "https://api.x.ai"
    },
    models: [
      presetModel("grok-2-latest", "Grok 2 Latest"),
      presetModel("grok-2-mini", "Grok 2 Mini"),
      presetModel("grok-beta", "Grok Beta")
    ]
  }),
  definePreset({
    kind: "groq",
    name: "Groq",
    description: "Fast OpenAI-compatible inference. Chat and Responses share one root.",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://console.groq.com/docs",
    keysURL: "https://console.groq.com/keys",
    endpoints: {
      openai: "https://api.groq.com/openai/v1",
      "openai-responses": "https://api.groq.com/openai/v1"
    },
    models: [
      presetModel("llama-3.3-70b-versatile", "Llama 3.3 70B"),
      presetModel("openai/gpt-oss-120b", "GPT-OSS 120B")
    ]
  }),
  definePreset({
    kind: "mistral",
    name: "Mistral AI",
    description: "Mistral Large and Codestral on the official Chat endpoint.",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://docs.mistral.ai/",
    keysURL: "https://console.mistral.ai/api-keys",
    endpoints: { openai: "https://api.mistral.ai/v1" },
    models: [
      presetModel("mistral-large-latest", "Mistral Large"),
      presetModel("codestral-latest", "Codestral"),
      presetModel("mistral-small-latest", "Mistral Small"),
      presetModel("pixtral-large-latest", "Pixtral Large")
    ]
  }),
  definePreset({
    kind: "perplexity",
    name: "Perplexity AI",
    description: "Sonar models with live search.",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://docs.perplexity.ai/",
    endpoints: { openai: "https://api.perplexity.ai" },
    models: [
      presetModel("sonar-pro", "Sonar Pro"),
      presetModel("sonar", "Sonar"),
      presetModel("sonar-reasoning", "Sonar Reasoning")
    ]
  })
]
