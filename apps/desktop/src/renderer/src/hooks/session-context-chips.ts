/**
 * 会话上下文芯片：知识钉入等。发送时取出拼进用户消息，不进输入框。
 */
export type SessionContextChip = {
  id: string
  kind: "knowledge"
  label: string
  path?: string
  snippet?: string
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
  pending.push(chip)
  notify()
}

export function removeSessionContextChip(id: string) {
  pending = pending.filter((item) => item.id !== id)
  notify()
}

export function takeSessionContextChips(): SessionContextChip[] {
  const chips = pending
  pending = []
  notify()
  return chips
}

export function formatContextChipsForSend(chips: SessionContextChip[]): string {
  return chips
    .filter((chip) => chip.snippet?.trim())
    .map((chip) => `> ${chip.path ?? chip.label}\n${chip.snippet!.trim()}`)
    .join("\n\n")
}

export function subscribeSessionContextChips(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
