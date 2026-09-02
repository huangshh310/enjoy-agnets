/**
 * 会话上下文芯片：知识钉入等。支持一键激活/排除（enabled 开关）。
 * 发送只取走启用芯片拼进用户消息；排除项留在队列，可再点亮。
 */
export type SessionContextChip = {
  id: string
  kind: "knowledge"
  label: string
  path?: string
  snippet?: string
  enabled?: boolean
}

let pending: SessionContextChip[] = []
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

export function listSessionContextChips(): SessionContextChip[] {
  return pending
}

export function addSessionContextChip(chip: SessionContextChip) {
  pending = pending.filter((item) => item.id !== chip.id)
  pending.push({ ...chip, enabled: chip.enabled ?? true })
  notify()
}

export function toggleSessionContextChip(id: string) {
  pending = pending.map((item) =>
    item.id === id ? { ...item, enabled: item.enabled === false } : item
  )
  notify()
}

export function removeSessionContextChip(id: string) {
  pending = pending.filter((item) => item.id !== id)
  notify()
}

export function takeSessionContextChips(): SessionContextChip[] {
  const taken = pending.filter((item) => item.enabled !== false)
  pending = pending.filter((item) => item.enabled === false)
  notify()
  return taken
}

export function formatContextChipsForSend(chips: SessionContextChip[]): string {
  return chips
    .filter((chip) => chip.enabled !== false && chip.snippet?.trim())
    .map((chip) => `> ${chip.path ?? chip.label}\n${chip.snippet!.trim()}`)
    .join("\n\n")
}

export function subscribeSessionContextChips(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
