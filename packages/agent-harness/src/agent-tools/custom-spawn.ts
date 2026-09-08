/**
 * 自定义 ACP spawn：只允许目录白名单 basename，shell:false 由调用方保证。
 */
import { basename, isAbsolute } from "node:path"
import { AGENT_TOOL_PRESETS } from "./presets.ts"

const EXTRA_ACP_BASENAMES = ["acp", "acp-agent", "agent-acp"] as const

const BLOCKED_BASENAMES = new Set([
  "bash",
  "sh",
  "zsh",
  "fish",
  "dash",
  "cmd",
  "powershell",
  "pwsh",
  "node",
  "nodejs",
  "npm",
  "npx",
  "yarn",
  "pnpm",
  "bun",
  "deno",
  "python",
  "python3",
  "perl",
  "ruby",
  "curl",
  "wget",
  "sudo",
  "su",
  "osascript"
])

/** 目录 binaries ∪ 少量 ACP 通用名；不含 companion、不含解释器。 */
export function allowedCustomBasenames(): Set<string> {
  const names = new Set<string>(EXTRA_ACP_BASENAMES)
  for (const preset of AGENT_TOOL_PRESETS) {
    for (const binary of preset.binaries) names.add(binary)
  }
  for (const blocked of BLOCKED_BASENAMES) names.delete(blocked)
  return names
}

export function assertCustomAllowedCommand(command: string) {
  const trimmed = command.trim()
  if (!trimmed) throw new Error("Command is required.")
  const name = basename(trimmed).replace(/\.(exe|cmd|bat)$/i, "")
  if (BLOCKED_BASENAMES.has(name) || !allowedCustomBasenames().has(name)) {
    throw new Error(`Refusing to spawn '${trimmed}'. Basename must be a known ACP CLI.`)
  }
  if (trimmed.includes("/") || trimmed.includes("\\")) {
    if (!isAbsolute(trimmed)) throw new Error("Custom CLI path must be absolute.")
  }
}

export function resolveCustomSpawn(command: string, args: string[] = []): { command: string; args: string[] } {
  const trimmed = command.trim()
  assertCustomAllowedCommand(trimmed)
  return { command: trimmed, args: [...args] }
}
