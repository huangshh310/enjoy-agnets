/**
 * 本机 ssh argv：新主机自动写入 known_hosts；密码登录不用 BatchMode。
 */
import type { SshAuth } from "@enjoy-agents/ipc-contract"
import { expandLocalPath } from "./ssh-client.ts"

export function sshClientArgs(
  spec: { host: string; user: string; port: number; auth: SshAuth; keyPath?: string },
  remoteCommand: string,
  tty = false
): string[] {
  const args: string[] = []
  if (tty) args.push("-t")
  args.push("-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=10", "-p", String(spec.port))
  if (spec.auth === "password") {
    args.push(
      "-o",
      "PreferredAuthentications=keyboard-interactive,password",
      "-o",
      "PubkeyAuthentication=no",
      "-o",
      "NumberOfPasswordPrompts=1"
    )
  } else {
    args.push("-o", "BatchMode=yes")
    if (spec.auth === "keypath" && spec.keyPath) args.push("-i", expandLocalPath(spec.keyPath))
  }
  args.push(`${spec.user}@${spec.host}`, remoteCommand)
  return args
}

export function usesPasswordAskpass(auth: SshAuth): boolean {
  return auth === "password"
}
