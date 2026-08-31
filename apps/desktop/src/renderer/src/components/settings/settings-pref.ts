/**
 * 设置页偏好补丁：写回后刷新 settings 查询。
 */
import { useQueryClient } from "@tanstack/react-query"
import { patchPreferences, useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"

export function usePrefUpdate() {
  const queryClient = useQueryClient()
  const settingsQuery = useSettingsSnapshot()
  const preferences = settingsQuery.data?.preferences
  async function update(patch: Partial<NonNullable<typeof preferences>>) {
    await patchPreferences(patch)
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }
  return { preferences, update }
}
