/**
 * 拉起 ACP 子进程：shell:false，cwd 锁工作区。
 */
import { spawn, type ChildProcess } from "node:child_process"
import { resolveSpawnCommand, type SpawnOverride } from "../agent-tools/resolve-spawn.ts"

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
    env: filteredEnv(input.env)
  })
  return { child, command: resolved.command, args: resolved.args }
}

function filteredEnv(extra?: Record<string, string>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (!BLOCKED_ENV.has(key)) env[key] = value
  }
  if (extra) {
    Object.assign(env, extra)
  }
  return env
}
