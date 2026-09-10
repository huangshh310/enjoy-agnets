/**
 * 本会话放行 bash 时只白名单命令前缀（前两个 token），不是整个 bash 工具。
 */
export function commandFromToolInput(input: unknown): string {
  if (typeof input === "string") return input
  if (input && typeof input === "object" && "command" in input) {
    const command = (input as { command?: unknown }).command
    return typeof command === "string" ? command : ""
  }
  return ""
}

export function bashAllowPrefix(command: string): string {
  const tokens = command.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return ""
  return tokens.slice(0, Math.min(2, tokens.length)).join(" ").toLowerCase()
}

export function sessionAllowsBash(
  command: string,
  prefixes: readonly string[] | undefined
): boolean {
  const prefix = bashAllowPrefix(command)
  if (!prefix || !prefixes?.length) return false
  const needle = prefix.toLowerCase()
  return prefixes.some((allowed) => {
    const item = allowed.trim().toLowerCase()
    return item !== "" && (needle === item || needle.startsWith(`${item} `))
  })
}
