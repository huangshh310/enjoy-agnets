/**
 * 列表副标题：短句、无协议微标。不要用品牌 meta 里的 ACP / ToolLoop 长文。
 */
const LIST_LINE_IDS = new Set([
  "enjoy-local",
  "claude",
  "cursor",
  "grok",
  "codex",
  "antigravity",
  "gemini",
  "opencode",
  "pi",
  "omp",
  "hermes",
  "amp",
  "deepseek"
])

export function listTaglineKey(runtimeId: string): string {
  if (LIST_LINE_IDS.has(runtimeId)) return `settings.agentTools.listLine.${runtimeId}`
  return "settings.agentTools.listLineDefault"
}
