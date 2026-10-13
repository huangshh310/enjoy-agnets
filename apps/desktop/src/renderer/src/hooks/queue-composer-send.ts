/**
 * 新对话还没建好时的发送：入队、失败还文。禁止先清输入再空等。
 * 二次 Enter 替换队列；还文与已键入合并；成功只清已发出的正文。
 */
import { useChatStore } from "../stores/chat-store"
import { readComposerDomText, syncComposerDom } from "./composer-dom"
import { setComposerWritebackHeld } from "./composer-sync-lock"
import {
  listComposerAssets,
  setComposerAssets,
  takeComposerAssetDetails,
  type QueuedComposerAsset
} from "./composer-assets"
import {
  isNewSessionCreatePending,
  shouldQueueComposerSend,
  waitForNewSessionCreate
} from "./new-session-create"
import { SEND_FAILED_RESTORE, SESSION_CREATE_TIMEOUT, SESSION_NOT_READY } from "./queue-composer-send-copy"

export {
  PREVIOUS_STILL_PREPARING,
  SEND_FAILED_RESTORE,
  SESSION_CREATE_TIMEOUT,
  SESSION_NOT_READY
} from "./queue-composer-send-copy"
export type { QueuedComposerAsset }

export type PreparedComposerSend = {
  content: string
  assets?: QueuedComposerAsset[]
  sessionId?: string
}

type QueuedSend = {
  seq: number
  content: string
  assets: QueuedComposerAsset[]
}

let queueSeq = 0
let queuedSend: QueuedSend | null = null
/** 最近一次被「新对话」取消掉的排队序号：只有它要还稿出提示，被它顶替过的旧序号已并进它。 */
let cancelledSeq: number | null = null

export function composerNeedsSessionReady(): boolean {
  const store = useChatStore.getState()
  return shouldQueueComposerSend(store.sessionId, isNewSessionCreatePending())
}

export function mergeComposerText(restored: string, current: string): string {
  const queued = restored.trim()
  const typed = current.trim()
  if (!typed) return restored
  if (!queued) return current
  if (typed.includes(queued) || typed === queued) return current
  if (queued.includes(typed)) return restored
  return `${current}\n${restored}`
}

export function remainingComposerAfterSend(sent: string, current: string): string {
  if (!current) return current
  if (current === sent) return ""
  if (current.startsWith(sent)) return current.slice(sent.length).replace(/^\s+/, "")
  if (sent.startsWith(current)) return ""
  return current
}

export function clearSentComposerText(sent: string): void {
  const store = useChatStore.getState()
  const current = readComposerDomText() || store.composer
  const next = remainingComposerAfterSend(sent, current)
  if (next !== store.composer) store.setComposer(next)
  setComposerWritebackHeld(false)
  syncComposerDom(next, true)
  if (!next && store.sessionId) store.clearSessionDraft(store.sessionId)
}

/**
 * jojo P1：建会话窗里首发入队即清输入框（store + DOM）。原文在队列里，失败路径照常还回。
 * 写回锁保持（入队期间仍禁止 store 半成品写回），只强制把 DOM 清空。
 */
export function clearQueuedComposerText(): void {
  const store = useChatStore.getState()
  if (store.composer) store.setComposer("")
  syncComposerDom("", true)
}

/** 还全文草稿，不改 error：发送闸中性条要留着。 */
export function restoreComposerDraft(text: string, assets?: QueuedComposerAsset[]): void {
  const store = useChatStore.getState()
  const next = mergeComposerText(text, store.composer)
  store.setComposer(next)
  setComposerWritebackHeld(false)
  syncComposerDom(next, true)
  if (assets?.length) setComposerAssets(mergeQueuedAssets(listComposerAssets(), assets))
}

export function restoreComposerAfterFailedSend(
  text: string,
  reason: string,
  assets?: QueuedComposerAsset[]
): void {
  const store = useChatStore.getState()
  store.setRunning(false)
  restoreComposerDraft(text, assets)
  store.setError(reason)
}

export function sendFailureCopy(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (message === "SESSION_CREATE_TIMEOUT") return SESSION_CREATE_TIMEOUT
  if (message === "NO_PENDING_SESSION_CREATE") return SESSION_NOT_READY
  return SEND_FAILED_RESTORE
}

export function absorbAssetsIntoQueuedSend(assets: QueuedComposerAsset[]): void {
  if (!queuedSend || assets.length === 0) return
  queuedSend = { ...queuedSend, assets: mergeQueuedAssets(queuedSend.assets, assets) }
}

export function resetQueuedComposerSendForTest(): void {
  queuedSend = null
  cancelledSeq = null
  queueSeq = 0
  setComposerWritebackHeld(false)
}

/** 点「新对话」取消上一窗未发出的队列，禁止创建完成时误发正在打的字。 */
export function cancelQueuedComposerSend(): void {
  if (queuedSend) cancelledSeq = queuedSend.seq
  queuedSend = null
  queueSeq += 1
  setComposerWritebackHeld(false)
}

export function hasQueuedComposerSend(): boolean {
  return queuedSend !== null
}

export async function waitThenSendAfterCreate(
  text: string,
  sendReady: (prepared: PreparedComposerSend) => Promise<void>,
  assets?: QueuedComposerAsset[],
  deps?: {
    readSessionId?: () => string | null
    onFail?: (text: string, reason: string, assets?: QueuedComposerAsset[]) => void
  }
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  setComposerWritebackHeld(true)
  const captured = assets ?? takeComposerAssetDetails()
  const seq = replaceQueuedSend(trimmed, captured)
  const fail = deps?.onFail ?? restoreComposerAfterFailedSend
  const readSessionId = deps?.readSessionId ?? (() => useChatStore.getState().sessionId)
  // 被取消（又开了一次新对话 / 启动补建把这次创建顶掉）不能静默：原文还回去并出提示。
  // 只有被更新的一次 Enter 顶替时才安静让位，那一次带着当下全文。
  let consumed = false
  const dropped = async (): Promise<boolean> => {
    if (consumed) return true
    if (queuedSend?.seq === seq) return false
    if (cancelledSeq !== seq) return true
    cancelledSeq = null
    // 新的创建窗还开着：等它发布完再还稿，否则 publish 的 idle 补丁会把提示和还回去的字一起洗掉。
    if (isNewSessionCreatePending()) await waitForNewSessionCreate().catch(() => undefined)
    fail(trimmed, SEND_FAILED_RESTORE, captured)
    return true
  }
  try {
    const sessionId = await waitForNewSessionCreate()
    if (await dropped()) return
    const prepared = queuedSend!
    queuedSend = null
    consumed = true
    if (readSessionId() !== sessionId) {
      fail(prepared.content, SEND_FAILED_RESTORE, prepared.assets)
      return
    }
    await sendReady({ content: prepared.content, assets: prepared.assets, sessionId })
  } catch (error) {
    if (await dropped()) return
    const prepared = queuedSend!
    queuedSend = null
    fail(prepared.content, sendFailureCopy(error), prepared.assets)
  }
}

function replaceQueuedSend(content: string, incoming: QueuedComposerAsset[]): number {
  const seq = ++queueSeq
  queuedSend = {
    seq,
    content,
    assets: mergeQueuedAssets(queuedSend?.assets ?? [], incoming)
  }
  return seq
}

function mergeQueuedAssets(
  current: QueuedComposerAsset[],
  incoming: QueuedComposerAsset[]
): QueuedComposerAsset[] {
  const seen: Record<string, true> = {}
  const next: QueuedComposerAsset[] = []
  for (const item of [...current, ...incoming]) {
    if (!item.id || seen[item.id]) continue
    seen[item.id] = true
    next.push(item)
  }
  return next
}
