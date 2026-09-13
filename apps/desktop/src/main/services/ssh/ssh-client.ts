/**
 * 本机 SSH/WSL 客户端：Windows 找 OpenSSH ssh.exe，cwd 用 homedir（含 USERPROFILE）。
 */
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

export function resolveSshExecutable(platform = process.platform, env = process.env): string {
  if (platform !== "win32") return "ssh"
  const root = env.SystemRoot || env.windir || "C:\\Windows"
  const bundled = join(root, "System32", "OpenSSH", "ssh.exe")
  if (existsSync(bundled)) return bundled
  return "ssh.exe"
}

export function resolveWslExecutable(platform = process.platform, env = process.env): string {
  if (platform !== "win32") return "wsl"
  const root = env.SystemRoot || env.windir || "C:\\Windows"
  const bundled = join(root, "System32", "wsl.exe")
  if (existsSync(bundled)) return bundled
  return "wsl.exe"
}

export function sshClientCwd(): string {
  const home = homedir()
  if (!home) throw new Error("Home directory is required for SSH client cwd.")
  return home
}

/** 展开本机密钥路径里的 ~，Windows 也能落到 USERPROFILE。 */
export function expandLocalPath(path: string, home = homedir()): string {
  const trimmed = path.trim()
  if (trimmed === "~") return home
  if (trimmed.startsWith("~/") || trimmed.startsWith("~\\")) return join(home, trimmed.slice(2))
  return trimmed
}
