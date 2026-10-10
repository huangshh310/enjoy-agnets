/**
 * 本会话放行 bash 时只白名单命令前缀（前两个 token），不是整个 bash 工具。
 * 含管道 / 重定向 / 命令替换、解释器 / 包运行器、包装器里的解释器，整句不记也不匹配。
 * 叶子文件：renderer 卡面与 main 共用，禁止经 agent-core 主入口引进渲染进程。
 */
const SESSION_BASH_UNSAFE = /[;&|`<>\n]|\$\(/

const WRAPPERS = new Set([
  "env",
  "sudo",
  "doas",
  "xargs",
  "nice",
  "ionice",
  "timeout",
  "command",
  "builtin",
  "nohup",
  "time",
  "exec",
  "stdbuf",
  "chrt"
])

const INTERPRETER_BINS = new Set([
  "sh",
  "bash",
  "zsh",
  "dash",
  "ksh",
  "fish",
  "csh",
  "tcsh",
  "node",
  "nodejs",
  "deno",
  "bun",
  "tsx",
  "ts-node",
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
  "uvx",
  "npx",
  "bunx"
])

const FLAG_TAKES_ARG = new Set([
  "-u",
  "--user",
  "-g",
  "--group",
  "-n",
  "--adjustment",
  "-c",
  "-p",
  "-s",
  "--signal",
  "-k",
  "--kill-after",
  "--unset",
  "-C",
  "--chdir",
  "-S",
  "--split-string",
  "-i",
  "-o",
  "-e",
  "-I",
  "-P",
  "-E",
  "-a"
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

/** 路径限定也认 basename：`/bin/bash -c` / `C:\\Python\\python.exe -c` 与裸名同等。 */
export function commandBasename(token: string): string {
  const base = token.replace(/\\/g, "/").split("/").pop() ?? token
  return base.replace(/\.(exe|cmd|bat)$/i, "").toLowerCase()
}

export function stripOuterQuotes(token: string): string {
  if (token.length >= 2) {
    const start = token[0]
    const end = token[token.length - 1]
    if ((start === "'" && end === "'") || (start === '"' && end === '"')) return token.slice(1, -1)
  }
  return token
}

function isAssignment(token: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*=/.test(token)
}

function isInterpreterBin(bin: string): boolean {
  if (INTERPRETER_BINS.has(bin)) return true
  return /^(python|pypy)[\d.]*$/.test(bin)
}

function peelWrappers(tokens: string[]): string[] {
  const out = [...tokens]
  while (out.length > 0) {
    const head = out[0] ?? ""
    if (isAssignment(head)) {
      out.shift()
      continue
    }
    const bin = commandBasename(stripOuterQuotes(head))
    if (!WRAPPERS.has(bin)) break
    out.shift()
    while (out.length > 0 && (out[0] ?? "").startsWith("-")) {
      const flag = (out.shift() ?? "").toLowerCase()
      const name = flag.split("=")[0] ?? flag
      if (!flag.includes("=") && FLAG_TAKES_ARG.has(name) && out.length > 0 && !(out[0] ?? "").startsWith("-")) {
        out.shift()
      }
    }
    if ((bin === "timeout" || bin === "nice" || bin === "ionice") && out.length > 0 && /^[0-9]/.test(out[0] ?? "")) {
      out.shift()
    }
  }
  return out
}

function firstWordRejected(token: string): boolean {
  return /['"`$=]/.test(token)
}

function pairRejected(bin: string, rest: string[]): boolean {
  const second = (rest[1] ?? "").toLowerCase()
  if (bin === "git" && second === "-c") return true
  if (bin === "npm" && (second === "exec" || second === "x")) return true
  if (bin === "pnpm" && (second === "exec" || second === "dlx")) return true
  if (bin === "bun" && second === "x") return true
  if (bin === "pipx" && second === "run") return true
  if (bin === "yarn" && second === "dlx") return true
  if (bin === "uv" && second === "run") return true
  if (bin === "ssh") return true
  if (bin === "find" && rest.some((token) => token === "-exec" || token === "-execdir")) return true
  if (bin === "sed" && rest.slice(1).some((token) => /(^|-)e$/.test(token) || token === "--expression")) return true
  return false
}

/**
 * 解释器 / 包运行器 / 包装器里的解释器：不记前缀、也不匹配。
 * 裸 `python` / `node` 也不记。`bash -lc`、`node --eval`、`npm exec`、`ssh host` 同拒。
 */
export function bashCommandIsInterpreterStyle(command: string): boolean {
  const peeled = peelWrappers(command.trim().split(/\s+/).filter(Boolean))
  const firstRaw = peeled[0]
  if (!firstRaw) return false
  const first = stripOuterQuotes(firstRaw)
  if (firstWordRejected(first)) return true
  const bin = commandBasename(first)
  if (isInterpreterBin(bin)) return true
  return pairRejected(bin, [first, ...peeled.slice(1)])
}

export function bashAllowPrefix(command: string): string {
  if (bashCommandHasUnsafeOperators(command) || bashCommandIsInterpreterStyle(command)) return ""
  const tokens = peelWrappers(command.trim().split(/\s+/).filter(Boolean))
  if (tokens.length === 0) return ""
  return tokens
    .slice(0, Math.min(2, tokens.length))
    .map((token) => stripOuterQuotes(token).toLowerCase())
    .join(" ")
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
