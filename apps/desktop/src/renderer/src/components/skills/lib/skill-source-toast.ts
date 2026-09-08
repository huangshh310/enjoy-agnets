/**
 * 技能源更新 toast：只报 C 端两句，不进空会话、不抛堆栈。
 */
export type SkillSourceToast = {
  id: number
  kind: "updated" | "missed"
  count: number
}

type Listener = (toast: SkillSourceToast | null) => void

let nextId = 1
let current: SkillSourceToast | null = null
const listeners = new Set<Listener>()
let hideTimer: ReturnType<typeof setTimeout> | undefined

export function showSkillSourceToast(kind: "updated" | "missed", count = 0): void {
  current = { id: nextId++, kind, count }
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    current = null
    emit(null)
  }, 2400)
  emit(current)
}

export function subscribeSkillSourceToast(listener: Listener): () => void {
  listeners.add(listener)
  listener(current)
  return () => {
    listeners.delete(listener)
  }
}

function emit(toast: SkillSourceToast | null): void {
  for (const listener of listeners) listener(toast)
}
