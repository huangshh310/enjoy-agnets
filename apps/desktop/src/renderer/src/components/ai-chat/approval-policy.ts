/**
 * 输入框盾牌：Harness permissionMode 三档 + 自定义开关。
 */
import {
  classifyPermissionMode,
  flagsForPermissionMode,
  toHarnessPermissionMode,
  type ApprovalPrefFlags,
  type PermissionMode
} from "@enjoy-agents/ipc-contract"
import type { TranslateFn } from "@renderer/i18n"


export type ApprovalPolicyKind = PermissionMode | "custom"
export type { ApprovalPrefFlags }

/** 风险档配色：Reads 冷静、Edits 提醒、All 放行 */
export const APPROVAL_PRESETS = [
  {
    id: "allow-reads" as const,
    colorClass: "text-accent-500 dark:text-accent-500",
    bgClass: "bg-accent-500/10 border-accent-500/25 hover:bg-accent-500/15 dark:bg-accent-500/15 dark:border-accent-500/30",
    iconColor: "text-accent-500 dark:text-accent-500"
  },
  {
    id: "allow-edits" as const,
    colorClass: "text-text-primary",
    bgClass: "bg-background-secondary-default border-border-button-default hover:bg-background-secondary-hover",
    iconColor: "text-foreground-icon-secondary"
  },
  {
    id: "allow-all" as const,
    colorClass: "text-status-yellow-text dark:text-status-yellow-text",
    bgClass: "bg-status-yellow-background/10 border-status-yellow-text/25 hover:bg-status-yellow-background/15 dark:bg-status-yellow-background/15 dark:border-status-yellow-text/30",
    iconColor: "text-status-yellow-text dark:text-status-yellow-text"
  }
]

const PRESET_COPY = {
  "allow-reads": { label: "chat.approvalReads", desc: "chat.approvalReadsDesc" },
  "allow-edits": { label: "chat.approvalEdits", desc: "chat.approvalEditsDesc" },
  "allow-all": { label: "chat.approvalAll", desc: "chat.approvalAllDesc" }
} as const

/** 三档文案随 locale 生成，配色仍走 APPROVAL_PRESETS。 */
export function getApprovalPresets(t: TranslateFn) {
  return APPROVAL_PRESETS.map((item) => ({
    ...item,
    label: t(PRESET_COPY[item.id].label),
    desc: t(PRESET_COPY[item.id].desc)
  }))
}

export const CUSTOM_PRESET_TONE = {
  colorClass: "text-text-secondary",
  bgClass: "bg-background-secondary-default border-border-button-default hover:bg-background-secondary-hover",
  iconColor: "text-foreground-icon-secondary"
}

export function toneForPolicy(kind: ApprovalPolicyKind) {
  if (kind === "custom") return CUSTOM_PRESET_TONE
  return APPROVAL_PRESETS.find((item) => item.id === kind) ?? CUSTOM_PRESET_TONE
}

const FLAG_DEFS = [
  { id: "requireWriteApproval" as const, label: "chat.approvalFiles", desc: "chat.approvalFilesDesc" },
  { id: "requireBashApproval" as const, label: "chat.approvalShell", desc: "chat.approvalShellDesc" },
  { id: "requireCommitApproval" as const, label: "chat.approvalGit", desc: "chat.approvalGitDesc" }
]

export function getApprovalFlags(t: TranslateFn) {
  return FLAG_DEFS.map((flag) => ({
    id: flag.id,
    label: t(flag.label),
    desc: t(flag.desc)
  }))
}

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

/** 缺省全开确认：与 Composer 盾牌同一默认。 */
export function flagsFromPrefs(prefs?: Partial<ApprovalPrefFlags> | null): ApprovalPrefFlags {
  return {
    requireWriteApproval: prefs?.requireWriteApproval ?? true,
    requireBashApproval: prefs?.requireBashApproval ?? true,
    requireCommitApproval: prefs?.requireCommitApproval ?? true
  }
}

export function cyclePermissionMode(current: PermissionMode): PermissionMode {
  if (current === "allow-reads") return "allow-edits"
  if (current === "allow-edits") return "allow-all"
  return "allow-reads"
}

