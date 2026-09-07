/**
 * 排队后续任务：当前 run 回 idle 后自动取出再开一轮。
 * 只在用户回车或点击引导词入队时产生，禁止倒计时自动入队。
 */
import type {
  EnqueueFollowupInput,
  FollowupItem,
  RuntimeHintCode
} from "./runtime-interact/followup-queue.types"

export type { EnqueueFollowupInput, FollowupItem, FollowupStatus, RuntimeHintCode } from "./runtime-interact/followup-queue.types"

let items: FollowupItem[] = []
let hint: RuntimeHintCode = null
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

export function listFollowups(sessionId?: string | null): FollowupItem[] {
  if (!sessionId) return items
  return items.filter((item) => item.sessionId === sessionId)
}

/** 入队。prompt / text 任填一个，写入时两者同值。 */
export function enqueueFollowup(item: EnqueueFollowupInput): FollowupItem {
  const prompt = item.prompt ?? item.text ?? ""
  const next: FollowupItem = {
    ...item,
    prompt,
    text: prompt,
    id: `follow_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    status: item.status ?? "pending"
  }
  items = [...items, next]
  notify()
  return next
}

export function removeFollowup(id: string) {
  items = items.filter((item) => item.id !== id)
  notify()
}

export function takeFollowup(id: string): FollowupItem | null {
  const found = items.find((item) => item.id === id) ?? null
  if (found) removeFollowup(id)
  return found
}

export function takeNextFollowup(sessionId: string): FollowupItem | null {
  const index = items.findIndex((item) => item.sessionId === sessionId)
  if (index < 0) return null
  const next = items[index]
  items = items.filter((_, i) => i !== index)
  notify()
  return next ?? null
}

/** 取出排队项以便回填输入框（正文 + 引用）。 */
export function editQueuedMessage(id: string): FollowupItem | null {
  return takeFollowup(id)
}

/** 取出并标成已升为纠偏；调用方再走 steer / 无 ActiveRun 回落。 */
export function elevateToSteer(id: string): FollowupItem | null {
  const taken = takeFollowup(id)
  if (!taken) return null
  return { ...taken, status: "elevated_to_steer" }
}

/** 同一会话内调整顺序；delta 为 -1 上移、+1 下移。 */
export function moveFollowup(id: string, delta: -1 | 1) {
  const current = items.find((item) => item.id === id)
  if (!current) return
  const sessionIds = items.filter((item) => item.sessionId === current.sessionId).map((item) => item.id)
  const pos = sessionIds.indexOf(id)
  const swap = pos + delta
  if (pos < 0 || swap < 0 || swap >= sessionIds.length) return
  const order = [...sessionIds]
  const left = order[pos]
  const right = order[swap]
  if (!left || !right) return
  order[pos] = right
  order[swap] = left
  const byId = new Map(items.map((item) => [item.id, item]))
  let cursor = 0
  items = items.map((item) => {
    if (item.sessionId !== current.sessionId) return item
    return byId.get(order[cursor++] ?? "") ?? item
  })
  notify()
}

export function setRuntimeHint(code: RuntimeHintCode) {
  hint = code
  notify()
}

export function getRuntimeHint(): RuntimeHintCode {
  return hint
}

export function subscribeFollowups(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
