/**
 * MCP stdio spawn：剥离危险环境变量，cwd 锁家目录，Windows 脚本走 shell。
 */
import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { delimiter, join } from "node:path"

const BLOCKED_ENV = new Set(["NODE_OPTIONS", "ELECTRON_RUN_AS_NODE"])

export function filteredStdioEnv(overrides?: Record<string, string>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (!BLOCKED_ENV.has(key)) env[key] = value
  }
  if (!overrides) return env
  for (const [key, value] of Object.entries(overrides)) {
    if (!BLOCKED_ENV.has(key)) env[key] = value
  }
  return env
}

export function stdioSpawnCwd(): string {
  return homedir()
}

export function spawnStdioProcess(
  bin: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv
): ChildProcess {
  const resolved = resolveStdioBin(bin)
  const winScript = process.platform === "win32" && /\.(cmd|bat)$/i.test(resolved)
  const file = winScript && /\s/.test(resolved) ? `"${resolved}"` : resolved
  const extra: SpawnOptions = {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    shell: winScript,
    cwd: stdioSpawnCwd(),
    env
  }
  return spawn(file, [...args], extra)
}

function resolveStdioBin(bin: string): string {
  if (bin.includes("/") || bin.includes("\\")) return bin
  const suffixes = process.platform === "win32" ? [".cmd", ".exe", ""] : [""]
  for (const dir of stdioPathDirs()) {
    for (const suffix of suffixes) {
      const candidate = join(dir, `${bin}${suffix}`)
      if (existsSync(candidate)) return candidate
    }
  }
  return bin
}

function stdioPathDirs(): string[] {
  const home = homedir()
  const system = (process.env.PATH ?? "").split(delimiter).filter(Boolean)
  if (process.platform === "win32") return system
  return [
    ...system,
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/home/linuxbrew/.linuxbrew/bin",
    join(home, ".linuxbrew", "bin")
  ]
}
