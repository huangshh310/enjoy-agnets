/**
 * 本会话 bash 前缀：失败关闭。拿不准就不记、不匹配，多弹几张卡。
 * 禁止剥引号 / VAR= / 包装器。叶子文件，renderer 卡面与 main 共用。
 */
const SESSION_BASH_UNSAFE = /[;&|`<>\n]|\$\(/
const TOKEN_CHARSET = /^[A-Za-z0-9._+/:=@%,-]+$/
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/

const WRAPPERS = new Set([
  "env",
  "sudo",
  "doas",
  "su",
  "nice",
  "ionice",
  "time",
  "timeout",
  "nohup",
  "xargs",
  "command",
  "builtin",
  "exec",
  "setsid",
  "strace",
  "ltrace",
  "watch",
  "flock",
  "stdbuf",
  "chrt",
  "script",
  "busybox",
  "unbuffer"
])

const INTERPRETER_BINS = new Set([
  "sh",
  "bash",
  "zsh",
  "dash",
  "ksh",
  "ash",
  "mksh",
  "fish",
  "csh",
  "tcsh",
  "node",
  "nodejs",
  "deno",
  "bun",
  "tsx",
  "ts-node",
  "py",
  "pythonw",
  "ipython",
  "perl",
  "ruby",
  "php",
  "lua",
  "luajit",
  "rscript",
  "r",
  "osascript",
  "powershell",
  "pwsh",
  "cmd",
  "eval",
  "source",
  ".",
  "awk",
  "gawk",
  "sed",
  "uvx",
  "npx",
  "pnpx",
  "bunx",
  "go",
  "java",
  "poetry",
  "bundle",
  "uv",
  "docker",
  "kubectl",
  "podman",
  "ssh",
  "scp",
  "rsync"
])

const DANGEROUS_TOKENS = new Set([
  "exec",
  "dlx",
  "x",
  "run",
  "-c",
  "--command",
  "--eval",
  "-e",
  "-p",
  "--print",
  "-r",
  "--exec",
  "-exec",
  "-execdir",
  "-ok",
  "-okdir",
  "--to-command",
  "--rsh",
  "-jar",
  "--require"
])

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

/** 路径限定也认 basename：`/usr/bin/git` 与裸名同等。反斜杠不剥（字符集已拒）。 */
export function commandBasename(token: string): string {
  const base = token.replace(/\\/g, "/").split("/").pop() ?? token
  return base.replace(/\.(exe|cmd|bat)$/i, "").toLowerCase()
}

function isInterpreterBin(bin: string): boolean {
  if (INTERPRETER_BINS.has(bin)) return true
  return /^(python|pypy|pythonw)[\d.]*$/.test(bin)
}

function tokenCharsetOk(token: string): boolean {
  return TOKEN_CHARSET.test(token)
}

function gitTokenRejected(token: string): boolean {
  const lower = token.toLowerCase()
  if (lower === "-c" || lower.startsWith("-c")) return true
  if (lower === "--config-env" || lower.startsWith("--config-env=")) return true
  if (lower === "--exec-path" || lower.startsWith("--exec-path=")) return true
  return false
}

function tokenLooksDangerous(token: string, firstBin: string): boolean {
  const lower = token.toLowerCase()
  if (DANGEROUS_TOKENS.has(lower)) return true
  if (firstBin === "git" && gitTokenRejected(token)) return true
  return false
}

function tokensOf(command: string): string[] {
  return command.trim().split(/\s+/).filter(Boolean)
}

/**
 * 解释器 / 包装器 / 赋值 / 可疑 token：不记前缀、也不匹配。
 * 首词已是壳 / 包装器时，即使同时有管道也算解释器（卡面 onceKind）。
 */
export function bashCommandIsInterpreterStyle(command: string): boolean {
  const tokens = tokensOf(command)
  if (tokens.length === 0) return true
  if (ASSIGNMENT.test(tokens[0] ?? "")) return true
  if (tokens.some((token) => WRAPPERS.has(commandBasename(token)))) return true
  const firstBin = commandBasename(tokens[0] ?? "")
  if (isInterpreterBin(firstBin)) return true
  if (bashCommandHasUnsafeOperators(command)) return false
  if (tokens.some((token) => !tokenCharsetOk(token))) return true
  return tokens.some((token) => tokenLooksDangerous(token, firstBin))
}

export function bashAllowPrefix(command: string): string {
  if (bashCommandHasUnsafeOperators(command) || bashCommandIsInterpreterStyle(command)) return ""
  const tokens = tokensOf(command)
  if (tokens.length === 0) return ""
  return tokens.slice(0, Math.min(2, tokens.length)).map((token) => token.toLowerCase()).join(" ")
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
