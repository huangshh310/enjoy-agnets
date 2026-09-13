/**
 * 本机拉起远端进程：SSH 或 WSL。终端带 -t，ACP 不带。
 * 密码登录经 SSH_ASKPASS，新主机 StrictHostKeyChecking=accept-new。
 */
import type { SshConnSpec } from "./ssh.types.ts"
import { sshClientArgs, usesPasswordAskpass } from "./ssh-argv.ts"
import { prepareSshAskpass } from "./ssh-askpass.ts"
import { resolveSshExecutable, resolveWslExecutable, sshClientCwd } from "./ssh-client.ts"

export type SshLaunch = {
  command: string
  args: string[]
  cwd: string
  env?: Record<string, string>
  cleanup?: () => void
}

export function launchRemoteProcess(
  spec: Pick<SshConnSpec, "host" | "user" | "port" | "auth" | "keyPath" | "password" | "transport">,
  remoteCommand: string,
  tty = false
): SshLaunch {
  if (spec.transport === "wsl") return wslLaunch(spec, remoteCommand)
  const args = sshClientArgs(spec, remoteCommand, tty)
  const launched: SshLaunch = { command: resolveSshExecutable(), args, cwd: sshClientCwd() }
  if (!usesPasswordAskpass(spec.auth)) return launched
  const ask = prepareSshAskpass(spec.password ?? "")
  launched.env = ask.env
  launched.cleanup = ask.cleanup
  return launched
}

function wslLaunch(
  spec: Pick<SshConnSpec, "host" | "user">,
  remoteCommand: string
): SshLaunch {
  const user = spec.user.trim()
  const userArgs = !user || user === "wsl" || user === spec.host ? [] : ["-u", user]
  return {
    command: resolveWslExecutable(),
    args: ["-d", spec.host, ...userArgs, "--", "bash", "-lc", remoteCommand],
    cwd: sshClientCwd()
  }
}
