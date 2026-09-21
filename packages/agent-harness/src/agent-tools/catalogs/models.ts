/**
 * 各 CLI 静态模型表。安装配方仍在 data.ts。
 */
import type { AgentCliModelDef } from "./types.ts"

export const CLAUDE_MODELS: AgentCliModelDef[] = [
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6" },
  { id: "claude-opus-4-6", label: "Opus 4.6" },
  { id: "claude-sonnet-5", label: "Sonnet 5" },
  { id: "claude-opus-5", label: "Opus 5" },
  { id: "claude-haiku-4-5", label: "Haiku 4.5" }
]

export const CURSOR_MODELS: AgentCliModelDef[] = [
  { id: "auto", label: "Auto" },
  { id: "composer-2.5", label: "Composer 2.5" },
  { id: "composer-2.5-fast", label: "Composer 2.5 Fast" },
  { id: "cursor-grok-4.6-xhigh-fast", label: "Cursor Grok 4.6 Extra High Fast" },
  { id: "gpt-5.6-sol-medium", label: "GPT-5.6 Sol" },
  { id: "claude-sonnet-5-thinking-high", label: "Claude Sonnet 5 Thinking" }
]

export const GROK_MODELS: AgentCliModelDef[] = [
  { id: "grok-4.6", label: "Grok 4.6" },
  { id: "grok-4.5", label: "Grok 4.5" }
]

export const CODEX_MODELS: AgentCliModelDef[] = [
  { id: "gpt-5.4", label: "GPT-5.4" },
  { id: "gpt-5", label: "GPT-5" },
  { id: "o3", label: "o3" },
  { id: "o4-mini", label: "o4-mini" }
]

export const ANTIGRAVITY_MODELS: AgentCliModelDef[] = [
  { id: "gemini-3.8-flash-high", label: "Gemini 3.8 Flash (High)" },
  { id: "gemini-3.7-flash-high", label: "Gemini 3.7 Flash (High)" },
  { id: "gemini-3.6-flash-high", label: "Gemini 3.6 Flash (High)" },
  { id: "gemini-3.1-pro-high", label: "Gemini 3.1 Pro (High)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (Thinking)" },
  { id: "claude-opus-4-6-thinking", label: "Claude Opus 4.6 (Thinking)" },
  { id: "gpt-oss-120b-medium", label: "GPT-OSS 120B (Medium)" }
]

export const GEMINI_MODELS: AgentCliModelDef[] = [
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" }
]
