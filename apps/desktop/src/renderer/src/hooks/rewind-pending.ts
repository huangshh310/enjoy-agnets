/**
 * 「从这里重来」截断成功后、原话还没安全落地之前的「待放回」记录（#167 leo BLOCK r3）。
 *
 * 问题：同会话写回被拒（组字 / 回写锁）时把原话写进**当前会话**的草稿没用——输入框还活着、拥有那份草稿，
 * 下一次按键（session-draft-storage 的订阅）和切走时的 saveCurrentSessionDraft 都会用输入框的内容盖掉它。
 * 等待期间也没有任何持久副本（库已截断），刷新 / 崩溃 / 退出就丢。
 *
 * 做法：
 * - 截断一成功就记一条（内存 + localStorage 键 enjoy-agents-pending-rewinds，mike 自己的键，输入框不碰它）。
 *   同会话多次重来按行合并进同一条。
 * - 放回规则（settlePendingRewind）：
 *   - 前台就是这个会话 → 只往输入框写（writeBackToComposer merge）；写不进就**一直等**（轮询），从不在同会话里退回草稿。
 *   - 前台已不是这个会话（切走了 / 重启后还没打开它）→ 这时输入框不再拥有它的草稿，按行合并进它的草稿
 *     （restoreRewindDraft），确认草稿里有这一整段、把草稿送到 main 之后才删记录。
 * - 关窗 / 刷新（pagehide / beforeunload）：每条记录按行并进它的草稿并立刻送到 main——前台会话以输入框当下的字为底，
 *   不用可能过期的内存草稿。记录不删（下次启动再对一遍，按行去重不会重复）。
 * - 同会话等待中：把「输入框当下的字 + 原话」按行写进它的草稿并立刻送到 main（被输入框盖掉就下一拍再补），
 *   等待中被强杀也不只靠 localStorage；main 看到有草稿，离开时也不会把它当空会话删掉。
 * - 启动时（本模块加载）把上次留下的记录读回来继续放：没打开的会话直接并进草稿；前台的在轮询里写输入框。
 * - 切会话那一下（store 订阅）只处理**离开的**会话（并进它的草稿），不碰新前台——它的输入框要等 loadSession 恢复完。
 */
import { useChatStore } from "../stores/chat-store"
import {
  flushPersistedDrafts,
  readPersistedDraft,
  readPersistedDraftAssets,
  writePersistedDraft,
  writePersistedDraftAssets
} from "../lib/session-draft-storage"
import { liveComposerText, mergeWritebackText, textContainsBlock, writeBackToComposer } from "./composer-writeback"
import { composerInputEl } from "./composer-dom"
import { restoreRewindDraft, type RewindDraftAsset } from "./rewind-draft-fallback"

export type PendingRewind = { text: string; assets: RewindDraftAsset[] }

const STORAGE_KEY = "enjoy-agents-pending-rewinds"

/** 进程内的源头；localStorage 只是镜像（重启后读回）。 */
let records: Record<string, PendingRewind> | null = null

function load(): Record<string, PendingRewind> {
  if (records) return records
  records = {}
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : null
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const [sessionId, value] of Object.entries(parsed as Record<string, unknown>)) {
        const rec = value as Partial<PendingRewind> | null
        if (!sessionId || !rec || typeof rec.text !== "string") continue
        records[sessionId] = { text: rec.text, assets: Array.isArray(rec.assets) ? rec.assets.filter((a) => a && typeof a.id === "string") : [] }
      }
    }
  } catch {
    // 坏数据：当作没有
  }
  return records
}

function save(): void {
  try {
    const map = load()
    const store = globalThis.localStorage
    if (!store) return
    if (Object.keys(map).length === 0) store.removeItem(STORAGE_KEY)
    else store.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // 配额满等：进程内记录还在
  }
}

export function readPendingRewind(sessionId: string): PendingRewind | undefined {
  return load()[sessionId]
}

export function listPendingRewindSessions(): string[] {
  return Object.keys(load())
}

/** 记一条（同会话已有就按行合并，图按 id 去重）。截断一成功就调。 */
export function recordPendingRewind(sessionId: string, text: string, assets: readonly RewindDraftAsset[]): void {
  if (!sessionId) return
  const map = load()
  const prev = map[sessionId]
  const seen = new Set<string>()
  const merged: RewindDraftAsset[] = []
  for (const asset of [...(prev?.assets ?? []), ...assets]) {
    if (!asset?.id || seen.has(asset.id)) continue
    seen.add(asset.id)
    merged.push({ id: asset.id, name: asset.name, mediaType: asset.mediaType, ...(asset.size !== undefined ? { size: asset.size } : {}) })
  }
  map[sessionId] = { text: prev ? mergeWritebackText(text, prev.text) : text, assets: merged }
  save()
}

function clearPendingRewind(sessionId: string): void {
  const map = load()
  if (!(sessionId in map)) return
  delete map[sessionId]
  save()
}

/** 这个会话的草稿（内存草稿优先，和打开会话时的取法一致）里有没有这一整段，图是不是都在。 */
function draftHas(sessionId: string, rec: PendingRewind): boolean {
  const memory = useChatStore.getState().getSessionDraft(sessionId)
  const draft = memory?.text ?? readPersistedDraft(sessionId) ?? ""
  if (!textContainsBlock(draft, rec.text)) return false
  const have = new Set(
    ((memory?.assets ?? readPersistedDraftAssets(sessionId) ?? []) as Array<{ id?: string }>).map((a) => a?.id)
  )
  return rec.assets.every((a) => have.has(a.id))
}

/**
 * 同会话还在等：把「输入框当下的字 + 原话」按行合并写进它的草稿并立刻送到 main（leo r4）。
 * 输入框下一次变化会用自己的字盖掉这份草稿——没关系：记录才是源头，草稿里缺了就下一拍再补（按行去重，补多少次都一样）。
 * 这样等待中被强杀，main 的草稿表里也有原话，不只靠 localStorage；离开时也不会被当成空会话删掉（main 有草稿就不删）。
 */
function mirrorIntoLiveDraft(sessionId: string, rec: PendingRewind): void {
  let changed = false
  if (!textContainsBlock(readPersistedDraft(sessionId) ?? "", rec.text)) {
    writePersistedDraft(sessionId, mergeWritebackText(rec.text, liveComposerText()))
    changed = true
  }
  const existing = readPersistedDraftAssets(sessionId) ?? []
  const ids = new Set(existing.map((a) => a.id))
  const extra = rec.assets.filter((a) => a?.id && !ids.has(a.id))
  if (extra.length > 0) {
    writePersistedDraftAssets(sessionId, [...existing, ...extra])
    changed = true
  }
  if (changed) flushPersistedDrafts()
}

/**
 * 写回之后光标放在用户自己打的字末尾（原话接在下一行），而不是跳到最后——用户可能正打着字（组字刚结束）。
 * 只在输入框正有焦点时动；拿不到元素 / 不支持 setSelectionRange 就不管（写回本身已按约定把光标留在末尾）。
 */
function keepCaretAfterTyped(typed: string, merged: string): void {
  const el = composerInputEl() as (HTMLTextAreaElement & { setSelectionRange?: (a: number, b: number) => void }) | null
  if (!el || typeof el.setSelectionRange !== "function") return
  const active = (globalThis as { document?: { activeElement?: unknown } }).document?.activeElement
  if (active !== el) return
  const head = typed.replace(/\s+$/, "")
  if (!head || !merged.startsWith(head)) return
  el.setSelectionRange(head.length, head.length)
}

export type SettleOutcome = "composer" | "draft" | "waiting" | "none"

/**
 * 试着放一次。composer = 进了前台输入框；draft = 会话不在前台，并进了它的草稿；waiting = 前台但现在写不进。
 * 只有确认落地才删记录。可能抛错（写 DOM 等），记录不动。
 */
export function settlePendingRewind(sessionId: string): SettleOutcome {
  const rec = readPendingRewind(sessionId)
  if (!rec) return "none"
  if (useChatStore.getState().sessionId !== sessionId) {
    restoreRewindDraft(sessionId, rec.text, rec.assets)
    flushPersistedDrafts()
    if (!draftHas(sessionId, rec)) return "waiting"
    clearPendingRewind(sessionId)
    return "draft"
  }
  const typed = liveComposerText()
  const written = writeBackToComposer({ text: rec.text, assets: rec.assets }, { mode: "merge", expectSessionId: sessionId, focus: false })
  if (!written.ok) {
    mirrorIntoLiveDraft(sessionId, rec)
    return "waiting"
  }
  if (written.merged) keepCaretAfterTyped(typed, written.text)
  flushPersistedDrafts()
  clearPendingRewind(sessionId)
  return "composer"
}

/** 放进了前台输入框之后要做的事（进程内：把截掉的尾巴从界面拿掉）。 */
type Landed = (sessionId: string, outcome: "composer" | "draft") => void
const landedHooks = new Map<string, Landed>()

export function onPendingRewindLanded(sessionId: string, hook: Landed): void {
  landedHooks.set(sessionId, hook)
}

const poll = { ms: 50 }
let timer: ReturnType<typeof setTimeout> | null = null
let warned = false

/** 测试用：调轮询间隔；null = 停掉轮询、清空记录和钩子。 */
export function resetPendingRewindsForTest(next?: { pollMs?: number } | null): void {
  if (timer) clearTimeout(timer)
  timer = null
  poll.ms = next?.pollMs ?? 50
  if (next === null || next === undefined) {
    records = {}
    save()
    records = null
    landedHooks.clear()
    warned = false
  }
}

/** 测试用：丢掉进程内记录（不动 localStorage），模拟重启后读回。 */
export function forgetPendingRewindCacheForTest(): void {
  records = null
  landedHooks.clear()
}

function runHook(sessionId: string, outcome: "composer" | "draft"): void {
  const hook = landedHooks.get(sessionId)
  landedHooks.delete(sessionId)
  try {
    hook?.(sessionId, outcome)
  } catch (error) {
    console.warn("[rewind] after landing failed", error)
  }
}

/**
 * 处理所有记录一遍。onlyBackground：只处理不在前台的会话（切会话那一下用：新前台的输入框要等 loadSession 恢复）。
 * 前台会话只在轮询里写（setTimeout 一拍之后）：loadSession 里换会话和恢复输入框在同一段同步代码里，轮询不会插进中间。
 */
function drain(opts: { onlyBackground?: boolean } = {}): void {
  const fg = useChatStore.getState().sessionId
  for (const sessionId of listPendingRewindSessions()) {
    if (sessionId === fg && opts.onlyBackground) continue
    try {
      const outcome = settlePendingRewind(sessionId)
      if (outcome === "composer" || outcome === "draft") runHook(sessionId, outcome)
    } catch (error) {
      if (!warned) console.warn("[rewind] put back pending text failed (will retry)", error)
      warned = true
    }
  }
}

/** 有记录就轮询到全部落地为止（同会话写不进就一直等，不设上限）。 */
export function ensurePendingRewindLoop(): void {
  if (timer || listPendingRewindSessions().length === 0) return
  const tick = () => {
    timer = null
    drain()
    if (listPendingRewindSessions().length > 0) {
      timer = setTimeout(tick, warned ? Math.max(poll.ms, 1000) : poll.ms)
      ;(timer as { unref?: () => void }).unref?.()
    }
  }
  timer = setTimeout(tick, poll.ms)
  ;(timer as { unref?: () => void }).unref?.()
}

/**
 * 关窗 / 刷新：每条记录按行并进它的草稿并立刻送到 main。前台会话以输入框当下的字为底（内存草稿可能是切走时的旧稿）。
 * 记录留着，下次启动再对一遍（按行去重，不会重复）。
 */
export function flushPendingRewindsOnHide(): void {
  const fg = useChatStore.getState().sessionId
  for (const sessionId of listPendingRewindSessions()) {
    const rec = readPendingRewind(sessionId)
    if (!rec) continue
    try {
      if (sessionId === fg) {
        writePersistedDraft(sessionId, mergeWritebackText(rec.text, liveComposerText()))
        const existing = readPersistedDraftAssets(sessionId) ?? []
        const ids = new Set(existing.map((a) => a.id))
        const extra = rec.assets.filter((a) => a?.id && !ids.has(a.id))
        if (extra.length > 0) writePersistedDraftAssets(sessionId, [...existing, ...extra])
      } else {
        restoreRewindDraft(sessionId, rec.text, rec.assets)
      }
    } catch (error) {
      console.warn("[rewind] flush pending text on hide failed", error)
    }
  }
  flushPersistedDrafts()
}

let installed = false

/** 装一次：关窗 / 刷新时落草稿；切会话时把离开的会话并进草稿；读回上次留下的记录继续放。 */
export function installPendingRewinds(): void {
  if (installed) return
  installed = true
  globalThis.addEventListener?.("pagehide", flushPendingRewindsOnHide)
  globalThis.addEventListener?.("beforeunload", flushPendingRewindsOnHide)
  useChatStore.subscribe((state, prev) => {
    if (state.sessionId === prev.sessionId) return
    if (listPendingRewindSessions().length === 0) return
    drain({ onlyBackground: true })
    ensurePendingRewindLoop()
  })
  ensurePendingRewindLoop()
}
