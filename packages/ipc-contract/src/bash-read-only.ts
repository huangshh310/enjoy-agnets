/**
 * luna P3：保守的只读 bash 白名单。命中的 bash 轮不算「可能改了文件」，不进待验收。
 * 失败关闭：先过本会话命令表同一套拒表（bashAllowCommand：超长 / 管道重定向等元字符 / 解释器 / 包装器 /
 * VAR= / 字符集外的 token 都返回 ""），再按首词做精确白名单。拿不准一律当写类（保持原行为）。
 * 首词必须是裸名（`/bin/ls` 不认），git 只认 status / diff / log 且选项走小白名单（`--output` / `--ext-diff` 等不认）。
 */
import { bashAllowCommand } from "./bash-prefix.ts"

const GIT_SAFE_FLAGS: Record<string, ReadonlySet<string>> = {
  status: new Set(["-s", "--short", "-b", "--branch", "--porcelain"]),
  diff: new Set(["--stat", "--name-only", "--name-status", "--cached", "--staged"]),
  log: new Set(["--oneline", "--stat", "--name-only"])
}

function gitReadOnly(tokens: string[]): boolean {
  const sub = tokens[1]
  if (!sub) return false
  const safe = GIT_SAFE_FLAGS[sub]
  if (!safe) return false
  return tokens.slice(2).every((token) => {
    if (token === "--") return true
    if (!token.startsWith("-")) return sub !== "status" || !token.includes("=")
    if (safe.has(token)) return true
    return sub === "log" && /^-(n)?[0-9]{1,4}$/.test(token)
  })
}

export function isReadOnlyBashCommand(command: unknown): boolean {
  if (typeof command !== "string") return false
  const normalized = bashAllowCommand(command)
  if (!normalized) return false
  const tokens = normalized.split(" ")
  const bin = tokens[0]
  if (bin === "pwd") return tokens.length === 1
  if (bin === "ls") return true
  if (bin === "cat") return tokens.length >= 2 && tokens.slice(1).every((token) => !token.startsWith("-"))
  if (bin === "git") return gitReadOnly(tokens)
  return false
}

/** 只认 `bash` 工具（code_mode 跑脚本，永远不算只读）。 */
export function isReadOnlyBashTool(tool: { name: string; args?: unknown }): boolean {
  if (tool.name !== "bash") return false
  const args = tool.args
  if (!args || typeof args !== "object") return false
  return isReadOnlyBashCommand((args as { command?: unknown }).command)
}
