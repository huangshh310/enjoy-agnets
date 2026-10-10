/**
 * 设为主引擎只改偏好指针；写盘由 persistRuntimeId → patchPreferences。
 */
export function applyPreferredRuntime(
  store: { setPreferredRuntimeId: (id: string) => void },
  runtimeId: string
): void {
  store.setPreferredRuntimeId(runtimeId)
}
