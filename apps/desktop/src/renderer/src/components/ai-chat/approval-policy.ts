/**
 * 输入框盾牌：Harness permissionMode 三档 + git 开关。
 */
import {
  classifyPermissionMode,
  flagsForPermissionMode,
  toHarnessPermissionMode,
  type ApprovalPrefFlags,
  type PermissionMode
} from "@enjoy-agents/ipc-contract"

export type ApprovalPolicyKind = PermissionMode | "custom"
export type { ApprovalPrefFlags }

export const APPROVAL_PRESETS = [
  {
    id: "allow-reads" as const,
    label: "Reads",
    desc: "Pause before edits, commits, and shell"
  },
  {
    id: "allow-edits" as const,
    label: "Edits",
    desc: "Auto-apply file edits; still ask shell and git"
  },
  {
    id: "allow-all" as const,
    label: "All",
    desc: "Auto-apply files; Harness still pauses all sandbox shell"
  }
]

export const APPROVAL_FLAGS = [
  { id: "requireWriteApproval" as const, label: "Files", desc: "write, edit, write_file, edit_file" },
  { id: "requireBashApproval" as const, label: "Shell", desc: "bash" },
  { id: "requireCommitApproval" as const, label: "Git", desc: "git_commit (host tool)" }
]

export function classifyApprovalPolicy(prefs: ApprovalPrefFlags): ApprovalPolicyKind {
  return classifyPermissionMode(prefs)
}

export function flagsForPolicy(kind: PermissionMode): ApprovalPrefFlags {
  return flagsForPermissionMode(kind)
}

/** 写入偏好时同时带上 Harness permissionMode，避免两套各记各的。 */
export function preferencesPatchFromFlags(flags: ApprovalPrefFlags) {
  return { ...flags, permissionMode: toHarnessPermissionMode(flags) }
}
