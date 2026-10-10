/**
 * 设为主引擎只改偏好指针；写盘由 persistRuntimeId → patchPreferences。
 * 单独成叶：asDefault 行为测不得一跳 import persist-runtime.ts（它 value-import 合约桶）。
 */
export function applyPreferredRuntime(
  store: { setPreferredRuntimeId: (id: string) => void },
  runtimeId: string
): void {
  store.setPreferredRuntimeId(runtimeId)
}
