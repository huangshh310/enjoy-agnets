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

export type AcpSpawnDirect = {
  command: string
  args: string[]
  cwd?: string
  handshakeCwd?: string
  failHint?: string
  env?: Record<string, string>
  cleanup?: () => void
}

/** spawn 用的本机 cwd：SSH 直连不得用 user@host:path。 */
export function acpSpawnCwd(workspaceRoot: string, spawnDirect?: Pick<AcpSpawnDirect, "cwd">): string {
  return spawnDirect?.cwd || workspaceRoot
}

export function acpHandshakeCwd(
  workspaceRoot: string,
  spawnDirect?: Pick<AcpSpawnDirect, "handshakeCwd">
): string {
  return spawnDirect?.handshakeCwd || workspaceRoot
}

export function mapAcpSpawnFailure(error: unknown, failHint?: string): Error {
  const raw = error instanceof Error ? error.message : String(error)
  if (failHint && !raw.includes(failHint)) return new Error(failHint)
  return error instanceof Error ? error : new Error(raw)
}

export function spawnAcpProcess(input: {
  id: string
  cwd: string
  override?: SpawnOverride
  env?: Record<string, string>
  spawnDirect?: AcpSpawnDirect
}): AcpSpawned {
  const resolved = input.spawnDirect ?? resolveSpawnCommand(input.id, input.override)
  const child = spawn(resolved.command, resolved.args, {
    cwd: acpSpawnCwd(input.cwd, input.spawnDirect),
    shell: false,
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
    env: filteredEnv(input.id, { ...input.env, ...input.spawnDirect?.env })
  })
  if (typeof child.pid === "number") {
    rememberAcpChild({
      pid: child.pid,
      toolId: input.id,
      command: resolved.command,
      startedAt: Date.now()
    })
  }
  child.on("exit", () => input.spawnDirect?.cleanup?.())
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
