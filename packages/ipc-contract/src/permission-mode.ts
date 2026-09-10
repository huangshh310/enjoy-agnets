/**
 * 与 AI SDK HarnessAgent.permissionMode 同名同义。
 * allow-reads / allow-edits / allow-all 管内置读写与 shell；git_commit / git_push 是我们多出来的一档。
 */
import { z } from "zod"

export const PermissionMode = z.enum(["allow-reads", "allow-edits", "allow-all"])
export type PermissionMode = z.infer<typeof PermissionMode>

export const ApprovalPrefFlags = z.object({
  requireWriteApproval: z.boolean(),
  requireBashApproval: z.boolean(),
  requireCommitApproval: z.boolean()
})
export type ApprovalPrefFlags = z.infer<typeof ApprovalPrefFlags>

const PRESET_FLAGS: Record<PermissionMode, ApprovalPrefFlags> = {
  "allow-reads": {
    requireWriteApproval: true,
    requireBashApproval: true,
    requireCommitApproval: true
  },
  "allow-edits": {
    requireWriteApproval: false,
    requireBashApproval: true,
    requireCommitApproval: true
  },
  "allow-all": {
    requireWriteApproval: false,
    requireBashApproval: false,
    requireCommitApproval: false
  }
}

export function flagsForPermissionMode(mode: PermissionMode): ApprovalPrefFlags {
  return { ...PRESET_FLAGS[mode] }
}

/** 三项开关能否对上某个 Harness 预设；对不上就是 Custom。 */
export function classifyPermissionMode(flags: ApprovalPrefFlags): PermissionMode | "custom" {
  const modes = PermissionMode.options
  return modes.find((mode) => sameFlags(PRESET_FLAGS[mode], flags)) ?? "custom"
}

/** 给 HarnessAgent.permissionMode 用：Custom 时取更安全的内置档。 */
export function toHarnessPermissionMode(flags: ApprovalPrefFlags): PermissionMode {
  const classified = classifyPermissionMode(flags)
  if (classified !== "custom") return classified
  if (!flags.requireWriteApproval && flags.requireBashApproval) return "allow-edits"
  if (!flags.requireWriteApproval && !flags.requireBashApproval) return "allow-all"
  return "allow-reads"
}

function sameFlags(left: ApprovalPrefFlags, right: ApprovalPrefFlags): boolean {
  return (
    left.requireWriteApproval === right.requireWriteApproval &&
    left.requireBashApproval === right.requireBashApproval &&
    left.requireCommitApproval === right.requireCommitApproval
  )
}
