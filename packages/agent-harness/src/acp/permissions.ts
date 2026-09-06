/**
 * ACP 权限选项 ↔ Enjoy 审批决定。
 */
export type AcpPermissionOption = {
  optionId: string
  name?: string
  kind?: string
}

export function pickAcpPermissionOption(
  decision: "allow" | "deny" | "allow_session",
  options: AcpPermissionOption[]
): { outcome: "selected"; optionId: string } | { outcome: "cancelled" } {
  if (decision === "deny") {
    const reject = options.find((item) => /reject|deny|cancel/i.test(`${item.kind ?? ""} ${item.optionId}`))
    return reject ? { outcome: "selected", optionId: reject.optionId } : { outcome: "cancelled" }
  }
  if (decision === "allow_session") {
    const always = options.find((item) => /always|allow_always|session/i.test(`${item.kind ?? ""} ${item.optionId}`))
    if (always) return { outcome: "selected", optionId: always.optionId }
  }
  const once = options.find((item) => /allow|approve|once/i.test(`${item.kind ?? ""} ${item.optionId}`))
  if (once) return { outcome: "selected", optionId: once.optionId }
  if (options[0]) return { outcome: "selected", optionId: options[0].optionId }
  return { outcome: "cancelled" }
}
