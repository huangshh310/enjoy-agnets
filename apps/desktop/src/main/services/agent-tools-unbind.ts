/**
 * 删除供应商档案时，把引用它的 CLI 退回官方登录。纯函数，便于单测。
 */

type BindOverride = {
  providerId?: string
  useCustomProvider?: boolean
  modelId?: string
}

export function unbindProviderInOverrides<T extends BindOverride>(
  all: Record<string, T>,
  providerId: string
): { next: Record<string, T>; changed: boolean } {
  if (!providerId) return { next: all, changed: false }
  let changed = false
  const next: Record<string, T> = { ...all }
  for (const [id, override] of Object.entries(all)) {
    if (override.providerId !== providerId) continue
    next[id] = {
      ...override,
      providerId: undefined,
      useCustomProvider: false,
      modelId: undefined
    }
    changed = true
  }
  return changed ? { next, changed } : { next: all, changed: false }
}
