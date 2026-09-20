/**
 * 保存后触发：工作区任意写盘防抖后开一轮。关应用取消未发的点，不补跑。
 */
const DEFAULT_DEBOUNCE_MS = 800
const pending = new Map<string, ReturnType<typeof setTimeout>>()

export const ON_SAVE_DEBOUNCE_KEY = "workspace-on-save"

export function onSaveDebounceMs(): number {
  return DEFAULT_DEBOUNCE_MS
}

/** 连续保存只留最后一次；delayMs=0 立刻跑（测试）。 */
export function scheduleOnSaveFire(
  fire: () => void | Promise<void>,
  delayMs = DEFAULT_DEBOUNCE_MS,
  key = ON_SAVE_DEBOUNCE_KEY
): void {
  cancelOnSaveFire(key)
  if (delayMs <= 0) {
    void fire()
    return
  }
  pending.set(
    key,
    setTimeout(() => {
      pending.delete(key)
      void fire()
    }, delayMs)
  )
}

export function cancelOnSaveFire(key?: string): void {
  if (key) {
    const timer = pending.get(key)
    if (timer) clearTimeout(timer)
    pending.delete(key)
    return
  }
  for (const timer of pending.values()) clearTimeout(timer)
  pending.clear()
}
