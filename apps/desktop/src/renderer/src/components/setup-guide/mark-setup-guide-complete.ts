/**
 * 记下启动引导已完成，并让设置快照重新读取。
 */
import { patchPreferences } from "@renderer/hooks/use-settings-snapshot"

export async function markSetupGuideComplete(refresh: () => Promise<unknown>): Promise<void> {
  await patchPreferences({ setupGuideCompletedAt: new Date().toISOString() })
  await refresh()
}
