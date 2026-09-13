/**
 * ACP 远程 spawn 规划：远端 cwd + catalog basename 白名单。
 * 本机 argv 是 ssh，不是远端 CLI 的假本地路径。
 */
import { basename } from "node:path"
import { quoteRemote } from "./ssh-path.ts"
import { launchRemoteProcess } from "./ssh-launch.ts"

export type AcpSpawnKind = "local" | "ssh"

export type AcpSshSpawnPlan = {
  mode: AcpSpawnKind
  command: string
  args: string[]
  /** 本机 ssh 客户端 cwd，禁止用 user@host:remotePath。 */
  cwd: string
  /** 远端 CLI 看到的会话 cwd。 */
  handshakeCwd: string
  failHint: string
  /** 密码登录的 SSH_ASKPASS，不含密码明文本身。 */
  env?: Record<string, string>
  cleanup?: () => void
}

export type AcpSpawnDirect = {
  command: string
  args: string[]
  cwd: string
  handshakeCwd: string
  failHint: string
  env?: Record<string, string>
  cleanup?: () => void
}

export function toAcpSpawnDirect(plan: AcpSshSpawnPlan): AcpSpawnDirect {
  return {
    command: plan.command,
    args: plan.args,
    cwd: plan.cwd,
    handshakeCwd: plan.handshakeCwd,
    failHint: plan.failHint,
    env: plan.env,
    cleanup: plan.cleanup
  }
}

export function mapAcpSpawnFailure(error: unknown, failHint?: string): Error {
  const raw = error instanceof Error ? error.message : String(error)
  if (failHint && !raw.includes(failHint)) return new Error(failHint)
  return error instanceof Error ? error : new Error(raw)
}

export function planAcpSshSpawn(input: {
  kind: AcpSpawnKind
  catalogBasename: string
  allowedBasenames: readonly string[]
  acpArgs: readonly string[]
  localCommand?: string
  localArgs?: readonly string[]
  localCwd?: string
  ssh?: {
    user: string
    host: string
    port: number
    auth?: "agent" | "keypath" | "password"
    keyPath?: string
    password?: string
    remotePath: string
    transport?: "ssh" | "wsl"
  }
}): AcpSshSpawnPlan {
  const binary = basename(input.catalogBasename.trim())
  if (!binary || !input.allowedBasenames.includes(binary)) {
    throw new Error(`ACP binary '${binary}' is not in the catalog whitelist.`)
  }
  if (input.kind !== "ssh") {
    const localCwd = input.localCwd || "."
    return {
      mode: "local",
      command: input.localCommand || binary,
      args: [...(input.localArgs ?? input.acpArgs)],
      cwd: localCwd,
      handshakeCwd: localCwd,
      failHint: ""
    }
  }
  const ssh = input.ssh
  if (!ssh) throw new Error("SSH spawn requires host/user/remotePath.")
  const remote = [`cd ${quoteRemote(ssh.remotePath)}`, "&&", "exec", binary, ...input.acpArgs].join(" ")
  const launched = launchRemoteProcess(
    {
      host: ssh.host,
      user: ssh.user,
      port: ssh.port,
      auth: ssh.auth ?? (ssh.keyPath ? "keypath" : "agent"),
      keyPath: ssh.keyPath,
      password: ssh.password,
      transport: ssh.transport
    },
    remote,
    false
  )
  return {
    mode: "ssh",
    command: launched.command,
    args: launched.args,
    cwd: launched.cwd,
    handshakeCwd: ssh.remotePath,
    failHint: `远端未找到 ${binary}`,
    env: launched.env,
    cleanup: launched.cleanup
  }
}

export function catalogBasenamesFrom(binaries: readonly string[]): string[] {
  return binaries.map((item) => basename(item)).filter(Boolean)
}
