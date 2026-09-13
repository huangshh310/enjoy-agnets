/**
 * 远端 ls 解析与失败映射。SSH 与 WSL 共用。
 */
import type { SshDirEntry, SshExecResult } from "./ssh.types.ts"
import { disconnectedError } from "./ssh-errors.ts"

export function parseLs(stdout: string): SshDirEntry[] {
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((name) =>
      name.endsWith("/")
        ? { name: name.slice(0, -1), kind: "directory" as const }
        : { name, kind: "file" as const }
    )
}

export function mapSshFailure(result: SshExecResult, path?: string): Error {
  const blob = `${result.stderr} ${result.stdout}`.toLowerCase()
  if (blob.includes("timed out") || blob.includes("timeout")) return new Error("超时")
  if (blob.includes("host key verification") || blob.includes("identification has changed")) {
    return new Error("主机指纹验证失败。新主机应已自动信任；若机器重装过，请确认这是你的服务器后再连。")
  }
  if (blob.includes("permission denied") || blob.includes("refused")) {
    return new Error("拒绝（密码或密钥不对）")
  }
  if (blob.includes("wsl") && blob.includes("there is no distribution")) return new Error("未找到 WSL 发行版")
  if (blob.includes("no such file") || path) return new Error(path ? `无此路径: ${path}` : "无此路径")
  if (blob.includes("connection")) return disconnectedError("ssh")
  return new Error(result.stderr.trim() || "SSH failed")
}
