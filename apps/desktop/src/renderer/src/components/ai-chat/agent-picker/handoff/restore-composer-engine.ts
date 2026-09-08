/**
 * 取消交接：把 Composer 选中态拉回 from。
 * 不 bind、不改偏好——pending 期间会话从未切到 to。
 */
export function restoreComposerEngineSelection(
  fromRuntimeId: string | null,
  setRuntimeId: (runtimeId: string) => void
): void {
  if (!fromRuntimeId) return
  setRuntimeId(fromRuntimeId)
}
