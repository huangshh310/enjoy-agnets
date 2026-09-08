/**
 * 本机 Agent CLI 目录。ACP 宿主可 spawn；companionBinaries 只给登录 / inspect。
 */
import type { AgentToolId, AgentToolTransport } from "@enjoy-agents/ipc-contract"

export type AgentToolPreset = {
  id: AgentToolId
  label: string
  transport: AgentToolTransport
  binaries: string[]
  /** 登录 / 模型探测可用，不能当 ACP 入口（pi、amp）。 */
  companionBinaries?: string[]
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
    id: "grok",
    label: "Grok Build",
    transport: "acp-host",
    binaries: ["grok"],
    acpArgs: ["agent", "stdio"],
    detectArgs: ["--version"],
    needsLoginHint: "grok login",
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
    acpArgs: ["--acp"],
    detectArgs: ["--version"],
    needsLoginHint: "Run gemini and choose Login with Google, or set GEMINI_API_KEY. Free Google One users should use Antigravity.",
    available: true,
    comingSoon: false,
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
    available: true,
    comingSoon: false,
    skillOnly: false
  },
  {
    id: "pi",
    label: "Pi",
    transport: "acp-host",
    binaries: ["pi-acp"],
    companionBinaries: ["pi"],
    acpArgs: [],
    detectArgs: ["--version"],
    needsLoginHint: "Install Pi and pi-acp. Official protocol is RPC; Enjoy speaks ACP via pi-acp.",
    available: true,
    comingSoon: false,
    skillOnly: false
  },
  {
    id: "omp",
    label: "Oh My Pi",
    transport: "acp-host",
    binaries: ["omp"],
    acpArgs: ["acp"],
    detectArgs: ["--version"],
    needsLoginHint: "ACP authenticate or TUI /login. Oh My Pi is a coding agent, not a skill root.",
    available: true,
    comingSoon: false,
    skillOnly: false
  },
  {
    id: "hermes",
    label: "Hermes",
    transport: "acp-host",
    binaries: ["hermes", "hermes-acp"],
    acpArgs: ["acp"],
    detectArgs: ["--version"],
    needsLoginHint: "hermes acp --setup (do not read ~/.hermes/.env)",
    available: true,
    comingSoon: false,
    skillOnly: false
  },
  {
    id: "amp",
    label: "Amp",
    transport: "acp-host",
    binaries: ["amp-acp"],
    companionBinaries: ["amp"],
    acpArgs: [],
    detectArgs: ["--version"],
    needsLoginHint: "Install amp and amp-acp, then amp login. There is no official amp acp subcommand.",
    available: true,
    comingSoon: false,
    skillOnly: false
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    transport: "acp-host",
    binaries: ["dsh"],
    acpArgs: ["--profile", "acp"],
    detectArgs: ["--version"],
    needsLoginHint: "Set DEEPSEEK_API_KEY, then dsh --profile acp",
    available: true,
    comingSoon: false,
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
