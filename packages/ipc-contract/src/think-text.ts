/**
 * 把正文里的 <think>…</think> 拆到思考轨迹。
 * 部分模型不走 reasoning-delta，只把思考写进 text-delta。
 */
export type ThinkBuffer = {
  visible: string
  think: string
  pendingThink: boolean
}

const OPEN = /<think>/i
const CLOSE = /<\/think>/i

export function absorbTextDelta(state: ThinkBuffer, delta: string): ThinkBuffer {
  let { visible, think, pendingThink } = state
  let rest = delta
  while (rest.length > 0) {
    if (pendingThink) {
      const end = rest.search(CLOSE)
      if (end < 0) return { visible, think: think + rest, pendingThink: true }
      think += rest.slice(0, end)
      rest = rest.slice(end + closeLength(rest, end))
      pendingThink = false
      continue
    }
    const start = rest.search(OPEN)
    if (start < 0) return { visible: visible + rest, think, pendingThink: false }
    visible += rest.slice(0, start)
    rest = rest.slice(start + openLength(rest, start))
    pendingThink = true
  }
  return { visible, think, pendingThink }
}

function openLength(text: string, index: number): number {
  return text.slice(index).match(OPEN)?.[0].length ?? 7
}

function closeLength(text: string, index: number): number {
  return text.slice(index).match(CLOSE)?.[0].length ?? 8
}

export function clampThoughtSeconds(startedAt: number, now = Date.now()): number | null {
  const seconds = Math.ceil((now - startedAt) / 1000)
  if (seconds <= 0) return 1
  if (seconds > 180) return null
  return seconds
}
