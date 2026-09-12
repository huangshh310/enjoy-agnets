/**
 * 审批策略读写：Composer 盾牌 persist 走这里。设置权限卡走 usePrefUpdate。
 */
import { useQueryClient } from "@tanstack/react-query"
import { patchPreferences, useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import {
  classifyApprovalPolicy,
  flagsFromPrefs,
  preferencesPatchFromFlags,
  type ApprovalPrefFlags
} from "./approval-policy"

export function useApprovalPolicyEditor() {
  const queryClient = useQueryClient()
  const flags = flagsFromPrefs(useSettingsSnapshot().data?.preferences)
  const kind = classifyApprovalPolicy(flags)

  async function persist(next: ApprovalPrefFlags) {
    await patchPreferences(preferencesPatchFromFlags(next))
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  return { flags, kind, persist }
}
