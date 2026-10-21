/**
 * 新对话还没建好时的发送：入队、失败还文。禁止先清输入再空等。
 * 二次 Enter 替换队列；还文与已键入合并；成功只清已发出的正文。
 */
import { useChatStore } from "../stores/chat-store"
import { setComposerIo } from "../stores/composer-io"
import { mergeComposerText } from "../lib/merge-composer-text"
import { readComposerDomText, syncComposerDom } from "./composer-dom"
import { setComposerWritebackHeld } from "./composer-sync-lock"
import { noteComposerSubmitted } from "./composer-ime"
import {
  listComposerAssets,
  setComposerAssets,
  takeComposerAssetDetails,
  type QueuedComposerAsset
} from "./composer-assets"
import { composerCanSend } from "./runtime-interact/composer-can-send"
import {
  isNewSessionCreatePending,
  shouldQueueComposerSend,
  waitForNewSessionCreate
} from "./new-session-create"
import {
  SEND_FAILED_RESTORE,
  SEND_FAILED_RESTORE_MERGED,
  SESSION_CREATE_TIMEOUT,
  SESSION_NOT_READY
} from "./queue-composer-send-copy"
import { pauseFollowupsAfterFailedStart } from "./followup-pause"

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
/** 当前排队首发（A）的整条等待；B 排在它后面。 */
let pendingFirstSend: Promise<void> | null = null
/** leo BLOCK：A 的结局。A 期间任何还稿（失败 / 闸拦 / 看门狗）都算没发出；sentSessionId 是 A 真交给 sendReady 的会话。 */
type FirstSendOutcome = { failed: boolean; sentSessionId: string | null }
let activeFirstSend: FirstSendOutcome | null = null
let firstSendOutcomes = new WeakMap<Promise<void>, FirstSendOutcome>()

export function composerNeedsSessionReady(): boolean {
  const store = useChatStore.getState()
  return shouldQueueComposerSend(store.sessionId, isNewSessionCreatePending())
}

export { mergeComposerText }

// leo r3 M1：store 补丁还稿（出字前回滚 / 失败回填）读输入框当下全文合并，再写回 DOM 并放开写回锁。
setComposerIo({
  read: () => readComposerDomText(),
  write: (text) => {
    setComposerWritebackHeld(false)
    syncComposerDom(text, true)
  }
})

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
 * kai send-p2 B（jojo 巡检 17–18）：sent = 这次交出去的原文，记成「刚交出去的」。输入框是受控的，写回锁期间
 * 它只认这条记录才肯跟着 store 清空（use-composer-ime）；回车走 captureComposerEnter 记过，**点发送按钮**没人记，
 * 框里的受控值把原话重新渲染回 DOM，建好会话时被 flush 成「后打的字」留在输入框并落成新会话的草稿，再按回车就重发。
 */
export function clearQueuedComposerText(sent?: string): void {
  if (sent !== undefined) noteComposerSubmitted(sent)
  const store = useChatStore.getState()
  if (store.composer) store.setComposer("")
  syncComposerDom("", true)
}

/** 还全文草稿，不改 error：发送闸中性条要留着。 */
export function restoreComposerDraft(text: string, assets?: QueuedComposerAsset[]): void {
  if (activeFirstSend) activeFirstSend.failed = true
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
  assets?: QueuedComposerAsset[],
  /** 这一发是从哪个会话发出的（停住它的排队）；不给就用前台会话。 */
  sentFromSessionId?: string | null
): void {
  const store = useChatStore.getState()
  // leo BLOCK #163 ③：在放 running 之前停住排队（看门狗等所有还稿路径都经这里）。
  // leo soft：停的是发出这一发的会话，不是此刻的前台（看门狗 3s 后触发时用户可能已切走）。
  pauseFollowupsAfterFailedStart(sentFromSessionId ?? store.sessionId, reason)
  store.setRunning(false)
  const before = store.composer
  restoreComposerDraft(text, assets)
  // leo soft：还回的字和输入框里后打的字拼成了两条——提示说清，Enter 会合成一条发出。
  const merged = reason === SEND_FAILED_RESTORE && isTwoMessageMerge(text, before)
  store.setError(merged ? SEND_FAILED_RESTORE_MERGED : reason)
}

function isTwoMessageMerge(restored: string, current: string): boolean {
  if (!restored.trim() || !current.trim()) return false
  return mergeComposerText(restored, current) === `${current}\n${restored}`
}

export function sendFailureCopy(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (message === "SESSION_CREATE_TIMEOUT") return SESSION_CREATE_TIMEOUT
  if (message === "NO_PENDING_SESSION_CREATE") return SESSION_NOT_READY
  return SEND_FAILED_RESTORE
}

export function resetQueuedComposerSendForTest(): void {
  queuedSend = null
  pendingFirstSend = null
  activeFirstSend = null
  firstSendOutcomes = new WeakMap()
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

export function waitThenSendAfterCreate(
  text: string,
  sendReady: (prepared: PreparedComposerSend) => Promise<void>,
  assets?: QueuedComposerAsset[],
  deps?: {
    readSessionId?: () => string | null
    onFail?: (text: string, reason: string, assets?: QueuedComposerAsset[]) => void
  }
): Promise<void> {
  const outcome: FirstSendOutcome = { failed: false, sentSessionId: null }
  activeFirstSend = outcome
  const run = waitThenSendAfterCreateInner(
    text,
    (prepared) => {
      outcome.sentSessionId = prepared.sessionId ?? null
      return sendReady(prepared)
    },
    assets,
    deps
  ).catch(() => {
    outcome.failed = true
  })
  firstSendOutcomes.set(run, outcome)
  pendingFirstSend = run
  void run.finally(() => {
    if (pendingFirstSend === run) pendingFirstSend = null
    if (activeFirstSend === outcome) activeFirstSend = null
  })
  return run
}

/**
 * jojo P1（#155 gate2）：「正在准备…」期间又按 Enter（B）。B 的正文和附件在按下那一刻取走（快照），
 * 输入框清空；等 A 真发出去（会话已建、A 已开跑）再把 B 放进运行中排队，A 跑完自动发 B。
 * 绝不把 B 的图并进 A，也不把 B 留在输入框。会话没建成 → B 原样还回输入框。
 */
export async function queueBehindPreparingSend(
  text: string,
  assets: QueuedComposerAsset[],
  deps: {
    enqueue: (input: { sessionId: string; prompt: string; assets: QueuedComposerAsset[] }) => void
    onFail?: (text: string, reason: string, assets?: QueuedComposerAsset[]) => void
  }
): Promise<void> {
  const ahead = pendingFirstSend
  const outcome = ahead ? firstSendOutcomes.get(ahead) : undefined
  if (ahead) await ahead
  const sessionId = useChatStore.getState().sessionId
  // leo BLOCK：A 没发出去（已还回输入框）时绝不自动续发 B——B 未经确认、且会跑到 A 前面；
  // A 失败后空会话可能已被删，B 也不能绑到它上面。B 的字和图接在 A 后面还回输入框，提示沿用 A 的。
  const aheadFailed = outcome ? outcome.failed || !outcome.sentSessionId || outcome.sentSessionId !== sessionId : false
  if (aheadFailed) {
    if (deps.onFail) deps.onFail(text, SEND_FAILED_RESTORE, assets)
    else restoreComposerDraft(text, assets)
    return
  }
  if (!sessionId) {
    ;(deps.onFail ?? restoreComposerAfterFailedSend)(text, SEND_FAILED_RESTORE, assets)
    return
  }
  deps.enqueue({ sessionId, prompt: text, assets })
}

async function waitThenSendAfterCreateInner(
  text: string,
  sendReady: (prepared: PreparedComposerSend) => Promise<void>,
  assets?: QueuedComposerAsset[],
  deps?: {
    readSessionId?: () => string | null
    onFail?: (text: string, reason: string, assets?: QueuedComposerAsset[]) => void
  }
): Promise<void> {
  const trimmed = text.trim()
  // 只贴图不打字也排队首发：正文空但有附件照样走。
  if (!composerCanSend({ text: trimmed, assetCount: assets?.length ?? listComposerAssets().length })) return
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
