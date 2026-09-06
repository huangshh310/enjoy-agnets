/**
 * 解析可 spawn 的命令：白名单文件名，或用户确认的绝对路径。
 */
import { basename, isAbsolute } from "node:path"
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

/** 未知 id、技能位、未接线或非白名单命令一律拒绝。 */
export function resolveSpawnCommand(id: string, override: SpawnOverride = {}): ResolvedSpawn {
  const preset = agentToolPreset(id)
  if (!preset) throw new Error(`Unknown agent tool '${id}'.`)
  if (preset.skillOnly) throw new Error(`${preset.label} is a skill target, not a runnable CLI.`)
  if (!preset.available || preset.transport !== "acp-host") {
    throw new Error(`${preset.label} is not wired for ACP yet.`)
  }
  const extra = override.extraArgs ?? []
  const custom = override.binaryPath?.trim()
  if (custom) {
    if (!isAbsolute(custom)) throw new Error("Custom CLI path must be absolute.")
    assertAllowedCommand(preset, custom)
    return {
      command: custom,
      args: [...acpArgsForCommand(preset, custom), ...modelArgsFor(id, override.modelId), ...extra]
    }
  }
  const command = preset.binaries[0]
  if (!command) throw new Error(`${preset.label} has no binary.`)
  return {
    command,
    args: [...acpArgsForCommand(preset, command), ...modelArgsFor(id, override.modelId), ...extra]
  }
}

/** Antigravity：agy-acp 自己就是 ACP 桥，agy 走 --acp。 */
export function acpArgsForCommand(preset: AgentToolPreset, command: string): string[] {
  if (preset.id !== "antigravity") return [...preset.acpArgs]
  const name = basename(command).replace(/\.(exe|cmd|bat)$/i, "")
  return name === "agy-acp" ? [] : ["--acp"]
}

export function assertAllowedCommand(preset: AgentToolPreset, command: string) {
  const name = basename(command).replace(/\.(exe|cmd|bat)$/i, "")
  if (preset.binaries.includes(name)) {
    if (command.includes("/") || command.includes("\\")) {
      if (!isAbsolute(command)) throw new Error("Custom CLI path must be absolute.")
    }
    return
  }
  throw new Error(`Refusing to spawn '${command}'. Use a catalog binary or a confirmed absolute path.`)
}
