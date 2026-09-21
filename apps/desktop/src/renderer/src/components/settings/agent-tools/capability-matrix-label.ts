/**
 * 能力矩阵行名：内置走固定表；自定义优先用户 label，不露出 raw id/slug。
 */
import { isCustomAgentId } from "@enjoy-agents/ipc-contract/custom-agent"

const BUILTIN_LABELS: Record<string, string> = {
  "enjoy-local": "Enjoy 本地",
  claude: "Claude Code",
  cursor: "Cursor CLI",
  grok: "Grok Build",
  codex: "Codex CLI",
  antigravity: "Antigravity",
  gemini: "Gemini CLI",
  opencode: "OpenCode",
  pi: "Pi",
  hermes: "Hermes",
  amp: "Amp",
  droid: "Factory Droid",
  devin: "Devin CLI",
  deepseek: "DeepSeek",
  omp: "Oh My Pi",
  qwen: "Qwen Code",
  kimi: "Kimi CLI",
  codebuddy: "CodeBuddy",
  glm: "GLM Agent",
  minimax: "MiniMax Code",
  qoder: "Qoder CLI"
}

/** 自定义行用显示名；缺省才回落 slug。 */
export function matrixRuntimeLabel(id: string, customLabel?: string): string {
  if (isCustomAgentId(id)) {
    const name = customLabel?.trim()
    return name || id.slice("custom:".length)
  }
  return BUILTIN_LABELS[id] ?? id
}
