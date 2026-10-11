/**
 * 本会话放行 bash 时只白名单命令前缀（前两个 token），不是整个 bash 工具。
 * 含管道 / 重定向 / 命令替换的整句不记前缀，也不吃已记前缀。
 */
const SESSION_BASH_UNSAFE = /[;&|`<>\n]|\$\(/

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

export function bashAllowPrefix(command: string): string {
  if (bashCommandHasUnsafeOperators(command)) return ""
  const tokens = command.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return ""
  return tokens.slice(0, Math.min(2, tokens.length)).join(" ").toLowerCase()
}

export function sessionAllowsBash(
  command: string,
  prefixes: readonly string[] | undefined
): boolean {
  if (bashCommandHasUnsafeOperators(command)) return false
  const prefix = bashAllowPrefix(command)
  if (!prefix || !prefixes?.length) return false
  const needle = prefix.toLowerCase()
  return prefixes.some((allowed) => {
    const item = allowed.trim().toLowerCase()
    return item !== "" && (needle === item || needle.startsWith(`${item} `))
  })
}
