/**
 * MCP 权限：默认不信任新 Server；连接 / 工具 / 写 / 读资源分级。
 */
export type PermissionLevel = "deny" | "ask" | "allow"

export function defaultLevel(trusted: boolean, scope: "server" | "tool" | "app"): PermissionLevel {
  if (!trusted) return scope === "server" ? "ask" : "deny"
  return scope === "app" ? "ask" : "allow"
}

export function decideMcpCall(options: {
  trusted: boolean
  level?: PermissionLevel
  mutating: boolean
}): "allow" | "ask" | "deny" {
  const level = options.level ?? defaultLevel(options.trusted, options.mutating ? "tool" : "server")
  if (level === "deny") return "deny"
  if (level === "allow" && !options.mutating) return "allow"
  if (level === "allow" && options.mutating) return "ask"
  return "ask"
}

/** ask 必须进审批，禁止 mcp.call 直接执行写工具。 */
export function mcpCallAction(decision: "allow" | "ask" | "deny"): "run" | "wait" | "deny" {
  if (decision === "deny") return "deny"
  if (decision === "ask") return "wait"
  return "run"
}
