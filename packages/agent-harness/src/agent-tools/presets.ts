/**
 * 本机 Agent CLI 目录。P0 可 spawn：claude / cursor / codex / antigravity。
 */
import type { AgentToolId, AgentToolTransport } from "@enjoy-agents/ipc-contract"

export type AgentToolPreset = {
  id: AgentToolId
  label: string
  transport: AgentToolTransport
  binaries: string[]
  acpArgs: string[]
  detectArgs: string[]
  needsLoginHint: string
  available: boolean
  comingSoon: boolean
  skillOnly: boolean
}

export const AGENT_TOOL_PRESETS: readonly AgentToolPreset[] = [
  {
    id: "enjoy-local",
    label: "Enjoy 本地",
    transport: "local",
    binaries: [],
    acpArgs: [],
    detectArgs: [],
    needsLoginHint: "",
    available: true,
    comingSoon: false,
    skillOnly: false
  },
  {
    id: "claude",
    label: "Claude Code",
    transport: "acp-host",
    binaries: ["claude"],
    acpArgs: ["acp"],
    detectArgs: ["--version"],
    needsLoginHint: "claude auth login",
    available: true,
    comingSoon: false,
    skillOnly: false
  },
  {
    id: "cursor",
    label: "Cursor CLI",
    transport: "acp-host",
    binaries: ["agent", "cursor-agent"],
    acpArgs: ["acp"],
    detectArgs: ["--version"],
    needsLoginHint: "agent login",
    available: true,
    comingSoon: false,
    skillOnly: false
  },
  {
    id: "codex",
    label: "Codex CLI",
    transport: "acp-host",
    binaries: ["codex"],
    acpArgs: ["acp"],
    detectArgs: ["--version"],
    needsLoginHint: "codex login",
    available: true,
    comingSoon: false,
    skillOnly: false
  },
  {
    id: "antigravity",
    label: "Antigravity",
    transport: "acp-host",
    // 有桥接优先 agy-acp；只有官方 CLI 时退回 agy --acp。
    binaries: ["agy-acp", "agy"],
    acpArgs: ["--acp"],
    detectArgs: ["--version"],
    needsLoginHint: "agy login",
    available: true,
    comingSoon: false,
    skillOnly: false
  },
  {
    id: "gemini",
    label: "Gemini CLI",
    transport: "acp-host",
    binaries: ["gemini"],
    acpArgs: ["--experimental-acp"],
    detectArgs: ["--version"],
    needsLoginHint: "gemini 先完成登录",
    available: false,
    comingSoon: true,
    skillOnly: false
  },
  {
    id: "opencode",
    label: "OpenCode",
    transport: "acp-host",
    binaries: ["opencode"],
    acpArgs: ["acp"],
    detectArgs: ["--version"],
    needsLoginHint: "opencode auth login",
    available: false,
    comingSoon: true,
    skillOnly: false
  },
  {
    id: "pi",
    label: "Pi",
    transport: "acp-host",
    binaries: ["pi"],
    acpArgs: [],
    detectArgs: ["--version"],
    needsLoginHint: "Pi 用本机配置，不读 Enjoy vault",
    available: false,
    comingSoon: true,
    skillOnly: false
  },
  {
    id: "omp",
    label: "Oh My Pi",
    transport: "local",
    binaries: [],
    acpArgs: [],
    detectArgs: [],
    needsLoginHint: "只投影 ~/.omp/skills，不单独启动进程",
    available: false,
    comingSoon: false,
    skillOnly: true
  },
  {
    id: "hermes",
    label: "Hermes",
    transport: "acp-host",
    binaries: ["hermes"],
    acpArgs: ["acp"],
    detectArgs: ["acp", "--check"],
    needsLoginHint: "模型在终端执行 hermes model，不读 ~/.hermes/.env",
    available: false,
    comingSoon: true,
    skillOnly: false
  },
  {
    id: "amp",
    label: "Amp",
    transport: "acp-host",
    binaries: ["amp"],
    acpArgs: ["acp"],
    detectArgs: ["--version"],
    needsLoginHint: "amp 先完成登录",
    available: false,
    comingSoon: true,
    skillOnly: false
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    transport: "local",
    binaries: [],
    acpArgs: [],
    detectArgs: [],
    needsLoginHint: "DeepSeek 仍走 Enjoy 本地模型，Harness 未接线",
    available: false,
    comingSoon: true,
    skillOnly: false
  }
]

export function agentToolPreset(id: string | undefined): AgentToolPreset | undefined {
  if (!id) return undefined
  return AGENT_TOOL_PRESETS.find((item) => item.id === id)
}

export function isAcpHostRuntime(id: string | undefined): boolean {
  const preset = agentToolPreset(id)
  return Boolean(preset?.transport === "acp-host" && preset.available && !preset.skillOnly)
}
