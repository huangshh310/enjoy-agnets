/**
 * 设置快照：输入框审批开关与 Settings 页共用同一 query。
 */
import { useQuery } from "@tanstack/react-query"
import type { SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "../lib/ide"

export function useSettingsSnapshot() {
  return useQuery({
    queryKey: ["settings"],
    enabled: hasIde(),
    queryFn: () => getIde().settings.get() as Promise<SettingsSnapshot>
  })
}

/** 合并写回偏好并保持默认值安全。 */
export async function patchPreferences(
  patch: Partial<SettingsSnapshot["preferences"]>
) {
  if (!hasIde()) return
  await getIde().settings.setPreferences(patch)
}
