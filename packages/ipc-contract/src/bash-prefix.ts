/**
 * 本会话放行 bash 时只白名单命令前缀（前两个 token），不是整个 bash 工具。
 * 含管道 / 重定向 / 命令替换、以及解释器式前缀的整句不记前缀，也不吃已记前缀。
 * 叶子文件：renderer 卡面与 main 共用，禁止经 agent-core 主入口引进渲染进程。
 */
const SESSION_BASH_UNSAFE = /[;&|`<>\n]|\$\(/

const INTERPRETER_BINS = new Set([
  "sh",
  "bash",
  "zsh",
  "dash",
  "ksh",
  "fish",
  "python",
  "python2",
  "python3",
  "node",
  "nodejs",
  "perl",
  "ruby",
  "deno",
  "npx",
  "bunx",
  "pnpm",
  "npm",
  "yarn",
  "cmd",
  "powershell",
  "pwsh",
  "eval",
  "exec",
  "source",
  "."
])

const INTERPRETER_CODE_FLAGS = new Set(["-c", "/c", "-e", "-command", "--command"])

export function commandFromToolInput(input: unknown): string {
  if (typeof input === "string") return input
  if (input && typeof input === "object" && "command" in input) {
    const command = (input as { command?: unknown }).command
    return typeof command === "string" ? command : ""
  }
  return ""
}

export function bashCommandHasUnsafeOperators(command: string): boolean {
  return SESSION_BASH_UNSAFE.test(command)
}

/** 路径限定也认 basename：`/bin/bash -c` / `C:\\Python\\python.exe -c` 与裸名同等。 */
export function commandBasename(token: string): string {
  const base = token.replace(/\\/g, "/").split("/").pop() ?? token
  return base.replace(/\.(exe|cmd|bat)$/i, "").toLowerCase()
}

/**
 * 解释器 / 包运行器等于任意代码：不记前缀、也不匹配。
 * `sh -c`、`python -c`、`node -e`、`npx`、`pnpm dlx`、`cmd /c`、`eval` 都只允许这一次。
 */
export function bashCommandIsInterpreterStyle(command: string): boolean {
  const tokens = command.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return false
  const bin = commandBasename(tokens[0] ?? "")
  if (bin === "npx" || bin === "bunx") return true
  if (bin === "eval" || bin === "exec" || bin === "source" || bin === ".") return true
  const flags = tokens.slice(1, 8).map((token) => token.toLowerCase())
  if ((bin === "pnpm" || bin === "npm" || bin === "yarn") && flags.includes("dlx")) return true
  if (bin === "deno" && flags.includes("eval")) return true
  if (!INTERPRETER_BINS.has(bin)) return false
  return flags.some((flag) => INTERPRETER_CODE_FLAGS.has(flag))
}

export function bashAllowPrefix(command: string): string {
  if (bashCommandHasUnsafeOperators(command) || bashCommandIsInterpreterStyle(command)) return ""
  const tokens = command.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return ""
  return tokens.slice(0, Math.min(2, tokens.length)).join(" ").toLowerCase()
}

export function sessionAllowsBash(
  command: string,
  prefixes: readonly string[] | undefined
): boolean {
  if (bashCommandHasUnsafeOperators(command) || bashCommandIsInterpreterStyle(command)) return false
  const prefix = bashAllowPrefix(command)
  if (!prefix || !prefixes?.length) return false
  const needle = prefix.toLowerCase()
  return prefixes.some((allowed) => {
    const item = allowed.trim().toLowerCase()
    return item !== "" && (needle === item || needle.startsWith(`${item} `))
  })
}
