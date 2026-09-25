/**
 * desktop_act 的审批策略：wait 放行、坐标/前台不吃会话白名单、审批卡文案。
 */

/** `wait` 不改界面，不停车。带坐标或要求前台时仍要问。 */
export function desktopActSkipsApproval(args: unknown): boolean {
  if (!args || typeof args !== "object") return false
  const row = args as Record<string, unknown>
  if (row.action !== "wait") return false
  if (row.allowForeground === true) return false
  return typeof row.x !== "number" && typeof row.y !== "number"
}

/** 坐标点击和「允许切到前台」不能被本会话放行盖掉。 */
export function desktopActBypassesSessionAllow(args: unknown): boolean {
  if (!args || typeof args !== "object") return false
  const row = args as Record<string, unknown>
  if (row.allowForeground === true) return true
  const hasElement = typeof row.elementId === "string" && row.elementId.trim().length > 0
  return !hasElement && (typeof row.x === "number" || typeof row.y === "number")
}

/** 审批卡上的一句话。 */
export function desktopActApprovalText(args: Record<string, unknown>): string {
  const app = text(args.appName) || "应用"
  const element = text(args.elementName) || text(args.elementId) || (typeof args.x === "number" ? "坐标" : "目标")
  const action = text(args.action) || "act"
  const foreground = args.allowForeground === true ? "会切到前台" : ""
  return [app, element, action, foreground].filter(Boolean).join(" · ")
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}
