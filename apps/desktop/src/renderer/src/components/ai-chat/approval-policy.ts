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

/** 风险档配色：Reads 冷静、Edits 提醒、All 高风险，和运行模式胶囊同一套分色。 */
export const APPROVAL_PRESETS = [
  {
    id: "allow-reads" as const,
    label: "Reads",
    desc: "Pause before edits, commits, and shell",
    colorClass: "text-sky-600 dark:text-sky-300",
    bgClass: "bg-sky-500/10 border-sky-500/25 hover:bg-sky-500/15 dark:bg-sky-500/15 dark:border-sky-500/30",
    iconColor: "text-sky-500 dark:text-sky-400"
  },
  {
    id: "allow-edits" as const,
    label: "Edits",
    desc: "Auto-apply file edits; still ask shell and git",
    colorClass: "text-amber-600 dark:text-amber-300",
    bgClass: "bg-amber-500/10 border-amber-500/25 hover:bg-amber-500/15 dark:bg-amber-500/15 dark:border-amber-500/30",
    iconColor: "text-amber-500 dark:text-amber-400"
  },
  {
    id: "allow-all" as const,
    label: "All",
    desc: "Auto-apply files; Harness still pauses all sandbox shell",
    colorClass: "text-rose-600 dark:text-rose-300",
    bgClass: "bg-rose-500/10 border-rose-500/25 hover:bg-rose-500/15 dark:bg-rose-500/15 dark:border-rose-500/30",
    iconColor: "text-rose-500 dark:text-rose-400"
  }
]

export const CUSTOM_PRESET_TONE = {
  colorClass: "text-text-secondary",
  bgClass: "bg-background-secondary-default border-border-button-default hover:bg-background-secondary-hover",
  iconColor: "text-foreground-icon-secondary"
}

export function toneForPolicy(kind: ApprovalPolicyKind) {
  if (kind === "custom") return CUSTOM_PRESET_TONE
  return APPROVAL_PRESETS.find((item) => item.id === kind) ?? CUSTOM_PRESET_TONE
}

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
