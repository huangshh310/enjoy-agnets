/**
 * CU-P1-A 桌面卡四选一：选项 id 即决策。无稳键藏始终允许，会话项仍跟 canSessionAllow。
 */
import type { ApprovalDecide } from "./approval.types"

export type DesktopApprovalChoice = "allow" | "allow_session" | "allow_always" | "deny"

const TEST_ID: Record<DesktopApprovalChoice, string> = {
  allow: "approval-allow",
  allow_session: "approval-session",
  allow_always: "approval-always-app",
  deny: "approval-deny"
}

export function desktopApprovalChoiceIds(input: {
  canSessionAllow: boolean
  canAlwaysAllow: boolean
}): DesktopApprovalChoice[] {
  const ids: DesktopApprovalChoice[] = ["allow"]
  if (input.canSessionAllow) ids.push("allow_session")
  if (input.canAlwaysAllow) ids.push("allow_always")
  ids.push("deny")
  return ids
}

export function resolveDesktopApprovalChoice(
  choice: DesktopApprovalChoice,
  available: readonly DesktopApprovalChoice[]
): DesktopApprovalChoice {
  return available.includes(choice) ? choice : defaultDesktopApprovalChoice(available)
}

/** 预览锁定：有稳键时默认高亮第三项「始终允许此应用」。 */
export function defaultDesktopApprovalChoice(
  available: readonly DesktopApprovalChoice[]
): DesktopApprovalChoice {
  return available.includes("allow_always") ? "allow_always" : "allow"
}

export function desktopApprovalChoiceTestId(choice: DesktopApprovalChoice): string {
  return TEST_ID[choice]
}

export function applyDesktopApprovalChoice(choice: DesktopApprovalChoice, decide: ApprovalDecide) {
  if (choice === "deny") {
    decide.onDeny()
    return
  }
  if (choice === "allow_session") {
    decide.onAllowSession()
    return
  }
  if (choice === "allow_always") {
    decide.onAllowAlways?.()
    return
  }
  decide.onApprove()
}
