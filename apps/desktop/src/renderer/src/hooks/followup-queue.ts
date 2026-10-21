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
/**
 * E1：按会话记队列为什么停着（停止 / 出错 / 额度用完）。停着时不自启，等用户点「继续」。
 * 按 sessionId 记在模块里，前台 / 后台停车都是同一份：后台那轮出错，切回来也不会自己发。
 * 队列空了就清掉（停着没意义，也不能拦住以后新排的）。
 */
/** engineSwitched：运行中换了助手（handoff 停了上一轮）；文案与「停止」不同，行为一样（只认「继续」）。 */
export type FollowupPausedReason = "stopped" | "engineSwitched" | "error" | "quota"
const paused = new Map<string, FollowupPausedReason>()
let hint: RuntimeHintCode = null
let hintSessionId: string | null = null
const listeners = new Set<() => void>()

function notify() {
  // 队列空了：暂停跟着清掉。
  for (const sessionId of paused.keys()) {
    if (!items.some((item) => item.sessionId === sessionId)) paused.delete(sessionId)
  }
  for (const listener of listeners) listener()
}

/** 这个会话的队列为什么停着；没停为 null。 */
export function followupPausedReason(sessionId: string | null | undefined): FollowupPausedReason | null {
  if (!sessionId) return null
  return paused.get(sessionId) ?? null
}

/** 停住这个会话的队列。队列是空的就不记（没什么可停的）。返回是否停住。 */
export function pauseFollowups(sessionId: string | null | undefined, reason: FollowupPausedReason): boolean {
  if (!sessionId || !items.some((item) => item.sessionId === sessionId)) return false
  const current = paused.get(sessionId)
  if (current === reason) return true
  // 同一次失败常常两头都报（run.error 带额度码、发送链再按通用失败报一次）：通用的「出错」不盖掉「额度用完」。
  if (current === "quota" && reason === "error") return true
  // leo BLOCK #163 ②：用户自己停的（停止 / 换助手）优先级最高——之后被停那一轮再报出错 / 额度，也不改成会自动解除的原因，
  // 否则随后任一轮 run.end 就把它放开，排队的自己发出去。
  if ((current === "stopped" || current === "engineSwitched") && (reason === "error" || reason === "quota")) return true
  // 换助手时先记 engineSwitched，随后被停那一轮的「用户停止」run.error 回来：不改回普通「停止」。
  if (current === "engineSwitched" && reason === "stopped") return true
  paused.set(sessionId, reason)
  notify()
  return true
}

/** 解除暂停（「继续」、重发成功）。订阅方（自启）随 notify 再试一次。 */
export function resumeFollowups(sessionId: string | null | undefined): void {
  if (!sessionId || !paused.has(sessionId)) return
  paused.delete(sessionId)
  notify()
}

/** 测试用。 */
export function resetFollowupsForTest(): void {
  items = []
  paused.clear()
  hint = null
  hintSessionId = null
  notify()
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

/** leo MUST 1（#155）：马上发失败 / 不能带图纠偏——原样放回队首（id、字、图、Chip 都不变）。 */
export function restoreFollowup(item: FollowupItem) {
  if (items.some((row) => row.id === item.id)) return
  items = [{ ...item, status: "pending" }, ...items]
  notify()
}

/**
 * E1「全部清空」撤回：按原顺序放回队首（已在队里的跳过）。
 * pausedReason：放回的同时就停住（同一次 notify 里），自启不会抢在暂停前把第一条发出去。
 */
export function restoreFollowups(list: readonly FollowupItem[], pausedReason?: FollowupPausedReason) {
  const fresh = list.filter((item) => !items.some((row) => row.id === item.id))
  if (fresh.length === 0) return
  items = [...fresh.map((item) => ({ ...item, status: "pending" as const })), ...items]
  const sessionId = fresh[0]?.sessionId
  if (pausedReason && sessionId) paused.set(sessionId, pausedReason)
  notify()
}

/** E1「全部清空」：一次取走这个会话的全部排队项（原顺序）。 */
export function takeAllFollowups(sessionId: string): FollowupItem[] {
  const taken = items.filter((item) => item.sessionId === sessionId)
  if (taken.length === 0) return []
  items = items.filter((item) => item.sessionId !== sessionId)
  notify()
  return taken
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

export function setRuntimeHint(code: RuntimeHintCode, sessionId?: string | null) {
  hint = code
  hintSessionId = code ? (sessionId ?? null) : null
  notify()
}

export function getRuntimeHint(): RuntimeHintCode {
  return hint
}

/** 提示只属于入队的那条会话。别的会话不显示上一句。 */
export function visibleRuntimeHint(sessionId: string | null): RuntimeHintCode {
  if (!hint || hintSessionId !== sessionId) return null
  return hint
}

export function subscribeFollowups(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
