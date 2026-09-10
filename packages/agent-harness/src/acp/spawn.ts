/**
 * 拉起 ACP 子进程：shell:false，cwd 锁工作区。
 * Amp 适配器需要 AMP_CLI_PATH 指向官方 amp。
 */
import { spawn, type ChildProcess } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { pathDirs } from "../agent-tools/detect/probe.ts"
import { resolveSpawnCommand, type SpawnOverride } from "../agent-tools/resolve-spawn.ts"
import { rememberAcpChild } from "./acp-child-store.ts"

export type AcpSpawned = {
  child: ChildProcess
  command: string
  args: string[]
}

const BLOCKED_ENV = new Set(["NODE_OPTIONS", "ELECTRON_RUN_AS_NODE"])

export function spawnAcpProcess(input: {
  id: string
  cwd: string
  override?: SpawnOverride
  env?: Record<string, string>
}): AcpSpawned {
  const resolved = resolveSpawnCommand(input.id, input.override)
  const child = spawn(resolved.command, resolved.args, {
    cwd: input.cwd,
    shell: false,
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
    env: filteredEnv(input.id, input.env)
  })
  if (typeof child.pid === "number") {
    rememberAcpChild({
      pid: child.pid,
      toolId: input.id,
      command: resolved.command,
      startedAt: Date.now()
    })
  }
  return { child, command: resolved.command, args: resolved.args }
}

function filteredEnv(id: string, extra?: Record<string, string>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (!BLOCKED_ENV.has(key)) env[key] = value
  }
  if (id === "amp" && !env.AMP_CLI_PATH) {
    const amp = firstOnPath("amp")
    if (amp) env.AMP_CLI_PATH = amp
  }
  if (extra) Object.assign(env, extra)
  return env
}

function firstOnPath(name: string): string | undefined {
  const suffixes = process.platform === "win32" ? ["", ".exe", ".cmd"] : [""]
  for (const dir of pathDirs()) {
    for (const suffix of suffixes) {
      const candidate = join(dir, `${name}${suffix}`)
      if (existsSync(candidate)) return candidate
    }
  }
  return undefined
}
