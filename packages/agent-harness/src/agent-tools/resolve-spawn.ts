/**
 * 解析可 spawn 的 ACP 命令：白名单文件名，或用户确认的绝对路径。
 * Pi / Amp 的 companion 二进制只给登录与 inspect，不能当 ACP 入口。
 */
import { basename, isAbsolute } from "node:path"
import { capabilitiesFor, type RuntimeCapabilities } from "@enjoy-agents/ipc-contract/runtime-capabilities"
import { modelArgsFor } from "./catalogs.ts"
import { agentToolPreset, type AgentToolPreset } from "./presets.ts"

export type SpawnOverride = {
  binaryPath?: string
  extraArgs?: string[]
  modelId?: string
}

export type ResolvedSpawn = {
  command: string
  args: string[]
}

/** 未知 id、技能位、未接线或非 ACP 入口一律拒绝。 */
export function resolveSpawnCommand(id: string, override: SpawnOverride = {}): ResolvedSpawn {
  const preset = agentToolPreset(id)
  if (!preset) throw new Error(`Unknown agent tool '${id}'.`)
  if (preset.skillOnly) throw new Error(`${preset.label} is a skill target, not a runnable CLI.`)
  if (!preset.available || preset.transport !== "acp-host") {
    throw new Error(`${preset.label} is not wired for ACP yet.`)
  }
  const extra = sanitizeAcpExtraArgs(id, override.extraArgs ?? [])
  const custom = override.binaryPath?.trim()
  if (custom) {
    if (!isAbsolute(custom)) throw new Error("Custom CLI path must be absolute.")
    assertAllowedCommand(preset, custom)
    assertAcpEntry(preset, custom)
    return { command: custom, args: spawnArgsFor(preset, custom, override.modelId, extra) }
  }
  const command = preset.binaries[0]
  if (!command) throw new Error(`${preset.label} has no binary.`)
  return { command, args: spawnArgsFor(preset, command, override.modelId, extra) }
}

/**
 * 按 capability 剥掉该 CLI 不认的旗标。未声明 fast=flag / thinking=acp-mode 则丢掉。
 * Cursor `agent acp` 只认 --help，`--fast` / `--thinking` 会 unknown option 并 exit 1。
 */
export function sanitizeAcpExtraArgs(id: string, extra: string[]): string[] {
  const cap = capabilitiesFor(id)
  return extra.filter((flag) => !isRejectedAcpFlag(flag, cap.fast, cap.thinking))
}

function isRejectedAcpFlag(
  flag: string,
  fast: RuntimeCapabilities["fast"],
  thinking: RuntimeCapabilities["thinking"]
): boolean {
  if (fast !== "flag" && flag === "--fast") return true
  if (thinking !== "acp-mode" && (flag === "--thinking" || flag.startsWith("--thinking="))) return true
  return false
}

/** Grok 的 --model 必须在 stdio 之前：`grok agent --model X stdio`。 */
function spawnArgsFor(
  preset: AgentToolPreset,
  command: string,
  modelId: string | undefined,
  extra: string[]
): string[] {
  if (preset.id === "grok") {
    const model = modelId?.trim()
    const mid = model ? ["--model", model] : []
    return ["agent", ...mid, "stdio", ...extra]
  }
  return [...acpArgsForCommand(preset, command), ...modelArgsFor(preset.id, modelId), ...extra]
}

/** Antigravity / Hermes：桥接二进制自己就是 ACP；官方 CLI 带子命令。 */
export function acpArgsForCommand(preset: AgentToolPreset, command: string): string[] {
  const name = cliBasename(command)
  if (preset.id === "antigravity") return name === "agy-acp" ? [] : ["--acp"]
  if (preset.id === "hermes") return name === "hermes-acp" ? [] : ["acp"]
  if (preset.id === "pi" || preset.id === "amp") return []
  return [...preset.acpArgs]
}

export function assertAllowedCommand(preset: AgentToolPreset, command: string) {
  const name = cliBasename(command)
  const allowed = new Set([...preset.binaries, ...(preset.companionBinaries ?? [])])
  if (allowed.has(name)) {
    if (command.includes("/") || command.includes("\\")) {
      if (!isAbsolute(command)) throw new Error("Custom CLI path must be absolute.")
    }
    return
  }
  throw new Error(`Refusing to spawn '${command}'. Use a catalog binary or a confirmed absolute path.`)
}

/** ACP 开流只允许 binaries，禁止把 pi / amp 登录 CLI 当成 ACP。 */
export function assertAcpEntry(preset: AgentToolPreset, command: string) {
  const name = cliBasename(command)
  if (preset.binaries.includes(name)) return
  throw new Error(
    `Refusing to spawn '${command}' as ACP. Use ${preset.binaries.join(" or ")}.`
  )
}

export function cliBasename(command: string): string {
  return basename(command).replace(/\.(exe|cmd|bat)$/i, "")
}
