/**
 * 官方可 /login 供应商的登录形态。只作展示与分流提示，真正能不能打开页仍看 stdout。
 * 来源：oh-my-pi providers.md + auth-broker callback 口 + 本机 v18 list。
 */
import type { AgentCliLoginKind } from "@enjoy-agents/ipc-contract"

const DEVICE = new Set(["github-copilot", "openai-codex-device"])
const LOCAL = new Set(["ollama", "lm-studio", "llama.cpp", "vllm"])
const OAUTH = new Set([
  "anthropic",
  "openai-codex",
  "cursor",
  "google-antigravity",
  "google-gemini-cli",
  "gitlab-duo",
  "gitlab-duo-agent",
  "devin",
  "zai",
  "zai-coding-plan",
  "kimi-code",
  "xai-oauth",
  "qwen-portal",
  "wafer-serverless",
  "ollama-cloud",
  "alibaba-coding-plan",
  "alibaba-token-plan",
  "minimax-code",
  "minimax-code-cn",
  "xiaomi",
  "xiaomi-token-plan-sgp",
  "xiaomi-token-plan-ams",
  "xiaomi-token-plan-cn"
])

export function loginKindFor(id: string): AgentCliLoginKind {
  if (DEVICE.has(id)) return "device"
  if (LOCAL.has(id)) return "local"
  if (OAUTH.has(id)) return "oauth"
  return "api_key"
}
