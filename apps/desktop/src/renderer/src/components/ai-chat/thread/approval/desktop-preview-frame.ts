/**
 * 线程里的桌面预览。关掉只隐藏图，不停当前 run。
 */
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"

export function useDesktopPreviewFrame(): { show: boolean; large: boolean } {
  const prefs = useSettingsSnapshot().data?.preferences
  return { show: prefs?.computerUsePreview !== false, large: prefs?.computerUsePreviewSize === "large" }
}
