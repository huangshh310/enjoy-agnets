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
 *     （restoreRewindDraft），确认草稿里有这一整段、把草稿送到 main 之后把记录**停放**（parked），不删。
 *   - 停放的记录等这个会话回到前台：输入框里已经有这一整段（和图）就删记录；没有（实机 11 / 14：切走前在组字，
 *     切回来组字结束时把旧的组字稿写进 store，盖掉了刚恢复的草稿）就按行并回输入框——恢复好的原话不会被盖没。
 *     停放的后台记录不占轮询（只在它回到前台时才动）。
 *     回到前台那一下就判（leo r7 S1）：切会话订阅排一个微任务，loadSession 恢复完输入框、用户还没法动它之前对一遍，
 *     不等下一拍轮询——否则用户在轮询前改了那行会被再追加一遍、清空了的会复活。到达时正在组字才等 compositionend。
 * - 会话被删（forgetPendingRewinds，leo r7 S3）：记录一起删，pagehide / 启动不再给已删的会话写孤儿草稿。
 * - 关窗 / 刷新（pagehide / beforeunload）：每条记录按行并进它的草稿并立刻送到 main——前台会话以输入框当下的字为底，
 *   不用可能过期的内存草稿。记录不删（下次启动再对一遍，按行去重不会重复）。
 * - 同会话等待中：把「输入框当下的字 + 原话」按行写进它的草稿并立刻送到 main（被输入框盖掉就下一拍再补），
 *   等待中被强杀也不只靠 localStorage；main 看到有草稿，离开时也不会把它当空会话删掉。
 * - 截断一成功（persistPendingRewindNow）：原话按行并进它的草稿并立刻送到 main，不等输入框防抖——
 *   截断后马上被强杀，重启时 main 的空会话清理也看得到草稿，不会把会话连同原话删掉。
 * - 启动时（本模块加载）把上次留下的记录读回来继续放：没打开的会话直接并进草稿；前台的在轮询里写输入框。
 * - 切会话那一下（store 订阅）同步只处理**离开的**会话（并进它的草稿），不碰新前台——它的输入框要等 loadSession 恢复完；
 *   新前台有停放的记录时排一个微任务（恢复完之后）立刻判定（leo r7 S1，见 settleParkedOnReturn）。
 */
import { useChatStore } from "../stores/chat-store"
import {
  flushPersistedDrafts,
  readPersistedDraft,
  readPersistedDraftAssets,
  writePersistedDraft,
  writePersistedDraftAssets
} from "../lib/session-draft-storage"
import {
  canWriteBackToComposer,
  liveComposerText,
  mergeWritebackText,
  textContainsBlock,
  writeBackToComposer
} from "./composer-writeback"
import { composerInputEl, syncComposerDom } from "./composer-dom"
import { isComposerComposing } from "./composer-ime"
import { cancelRewindFinishFailedToastOnRestored } from "./rewind-finish-failed-toast"
import { listComposerAssets, queueComposerAsset } from "./composer-assets"
import { restoreRewindDraft, type RewindDraftAsset } from "./rewind-draft-fallback"

/** parked：已经并进原会话草稿（切走了），等它回到前台、确认输入框里有这一段才删。 */
export type PendingRewind = { text: string; assets: RewindDraftAsset[]; parked?: boolean }

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
        records[sessionId] = {
          text: rec.text,
          assets: Array.isArray(rec.assets) ? rec.assets.filter((a) => a && typeof a.id === "string") : [],
          ...(rec.parked === true ? { parked: true } : {})
        }
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
  // 新的一段还没落地：不再算停放。
  map[sessionId] = { text: prev ? mergeWritebackText(text, prev.text) : text, assets: merged }
  save()
}

/** 已并进原会话草稿：停放，等它回到前台再对一遍输入框。 */
function parkPendingRewind(sessionId: string): void {
  const rec = load()[sessionId]
  if (!rec || rec.parked) return
  rec.parked = true
  save()
}

/** 需要轮询的会话：没停放的，加上停放了但现在在前台的。 */
function activePendingRewindSessions(): string[] {
  const fg = useChatStore.getState().sessionId
  const map = load()
  return Object.keys(map).filter((sessionId) => !map[sessionId]!.parked || sessionId === fg)
}

function clearPendingRewind(sessionId: string): void {
  const map = load()
  if (!(sessionId in map)) return
  delete map[sessionId]
  save()
}

/**
 * 这些会话被删了（leo r7 S3）：它们的待放回记录（停放的、还在等的）和落地钩子一起删。
 * 不删的话记录永远留着，每次 pagehide / 启动都会给已删的会话往 main 写一行孤儿草稿。删会话的调用方（workspace-lifecycle）调。
 */
export function forgetPendingRewinds(sessionIds: readonly string[]): void {
  const map = load()
  let changed = false
  for (const sessionId of sessionIds) {
    landedHooks.delete(sessionId)
    if (compositionWait?.sessionId === sessionId) stopCompositionWait()
    if (!(sessionId in map)) continue
    delete map[sessionId]
    changed = true
  }
  if (changed) save()
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
 * 截断一成功就把原话按行并进这个会话的草稿，并**立刻**送到 main（不等输入框的防抖落盘；host F1）。
 * 为什么：main 启动时的 pruneEmptySessions 看不到 renderer 的「待放回」记录（localStorage）。截断成功后、
 * 原话到 main 之前被强杀（kill -9），重启时 main 会把这个「空」会话（尤其首条就被重来的新对话）删掉，原话跟着没了。
 * - 前台还是这个会话：走等待中的同一条路（mirrorIntoLiveDraft：输入框当下的字 + 原话按行合并，图按 id 去重）。
 *   之后写回输入框算出的是同一段（mergeWritebackText 同样的两边），草稿订阅写进来相同就不动，不会叠两遍。
 * - 前台已换会话：按行并进原会话草稿（restoreRewindDraft），之后 settle 再并一次按行去重，不重复。
 * - 失败只记日志：记录还在，后面的放回 / 关窗 / 启动照常兜底，不影响重来本身。
 */
export function persistPendingRewindNow(sessionId: string): void {
  try {
    const rec = readPendingRewind(sessionId)
    if (!rec) return
    if (useChatStore.getState().sessionId === sessionId) mirrorIntoLiveDraft(sessionId, rec)
    else restoreRewindDraft(sessionId, rec.text, rec.assets)
    flushPersistedDrafts()
  } catch (error) {
    console.warn("[rewind] persist original text to main right after truncate failed", error)
  }
}

/** 写回之后最多跟几帧去放光标（React 把受控 value 落定通常 1–2 帧）。 */
const CARET_FRAMES = 10

function nextFrame(fn: () => void): void {
  const raf = (globalThis as { requestAnimationFrame?: (cb: () => void) => unknown }).requestAnimationFrame
  if (typeof raf === "function") raf(fn)
  else (setTimeout(fn, 16) as { unref?: () => void }).unref?.()
}

/**
 * 写回之后光标放在用户自己打的字末尾（原话接在下一行），而不是跳到最后——用户可能正打着字（组字刚结束）。
 * 只在输入框正有焦点时动；拿不到元素 / 不支持 setSelectionRange 就不管（写回本身已按约定把光标留在末尾）。
 *
 * 实机 10（光标跳到原话末尾）：输入框是受控 textarea，显示的是 useComposerIme 的本地 shown；写回只改了 store + DOM。
 * 接下来 React 先按旧的 shown 提交一次（DOM 被改回 typed），effect 再 setShown(merged) 提交第二次（DOM 改成 merged）——
 * 程序化改 value，光标都落到末尾，写回当下放好的光标就被冲掉了。所以放一次之后再跟几帧：DOM 落定成 merged 且光标被
 * 冲到末尾就再放回去；连续两帧都在 typed 末尾就停。用户这期间改了字 / 挪了光标 / 选了字 / 焦点走了，立刻停，不跟用户抢。
 */
function keepCaretAfterTyped(typed: string, merged: string): void {
  const el = composerInputEl() as (HTMLTextAreaElement & { setSelectionRange?: (a: number, b: number) => void }) | null
  if (!el || typeof el.setSelectionRange !== "function") return
  const focused = () => (globalThis as { document?: { activeElement?: unknown } }).document?.activeElement === el
  if (!focused()) return
  const head = typed.replace(/\s+$/, "")
  if (!head || head.length >= merged.length || !merged.startsWith(head)) return
  const at = head.length
  el.setSelectionRange(at, at)
  let frames = 0
  let stable = 0
  const tick = () => {
    frames += 1
    if (!focused()) return
    const value = el.value
    if (value === merged) {
      const start = el.selectionStart
      const end = el.selectionEnd
      if (start === at && end === at) {
        stable += 1
        if (stable >= 2) return
      } else if (start === end && start === merged.length) {
        // React 重设 value 把光标冲到了末尾
        el.setSelectionRange(at, at)
        stable = 0
      } else {
        return
      }
    } else if (value !== typed) {
      // 不是 React 那一下回退（回退时 DOM 正好是 typed）：用户改了字
      return
    }
    if (frames < CARET_FRAMES) nextFrame(tick)
  }
  nextFrame(tick)
}

/** parked：停放在原会话草稿里、会话不在前台，这一拍什么都不做。 */
export type SettleOutcome = "composer" | "draft" | "waiting" | "parked" | "none"

/**
 * 试着放一次。composer = 进了前台输入框；draft = 会话不在前台，并进了它的草稿；waiting = 前台但现在写不进。
 * 只有确认落地才删记录。可能抛错（写 DOM 等），记录不动。
 */
export function settlePendingRewind(sessionId: string): SettleOutcome {
  const rec = readPendingRewind(sessionId)
  if (!rec) return "none"
  if (useChatStore.getState().sessionId !== sessionId) {
    if (rec.parked) return "parked"
    restoreRewindDraft(sessionId, rec.text, rec.assets)
    flushPersistedDrafts()
    if (!draftHas(sessionId, rec)) return "waiting"
    // 不删：回到前台时输入框可能被切走前没结束的组字盖掉（实机 11 / 14），那时还要并回去。
    parkPendingRewind(sessionId)
    return "draft"
  }
  const typed = liveComposerText()
  const written = writeBackToComposer({ text: rec.text, assets: rec.assets }, { mode: "merge", expectSessionId: sessionId, focus: false })
  if (!written.ok) {
    mirrorIntoLiveDraft(sessionId, rec)
    return "waiting"
  }
  // 输入框里本来就有这段（停放的回到前台、切回时草稿已恢复）时字没变，keepCaretAfterTyped 自己不动光标。
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
    stopCompositionWait()
  }
}

/** 测试用：轮询退到慢拍（warned）了没有。 */
export function pendingRewindWarnedForTest(): boolean {
  return warned
}

/** 测试用：轮询是否在跑。 */
export function pendingRewindLoopRunningForTest(): boolean {
  return timer !== null
}

/** 测试用：丢掉进程内记录（不动 localStorage），模拟重启后读回。 */
export function forgetPendingRewindCacheForTest(): void {
  records = null
  landedHooks.clear()
}

function runHook(sessionId: string, outcome: "composer" | "draft"): void {
  // luna n167 P2：原话已放回输入框 → 取消尚未弹出的「还没能放回」toast。
  if (outcome === "composer") cancelRewindFinishFailedToastOnRestored()
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
 * （停放的会话回到前台另由切会话订阅的微任务立刻判，不等这一拍；轮询只兜底组字中 / 回写锁中写不了的情况。）
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

/** 有要动的记录就轮询到全部落地为止（同会话写不进就一直等，不设上限）；停放在后台的不算，回到前台时由切会话订阅再拉起。 */
export function ensurePendingRewindLoop(): void {
  if (timer || activePendingRewindSessions().length === 0) return
  const tick = () => {
    timer = null
    drain()
    if (activePendingRewindSessions().length > 0) {
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

/**
 * 停放的会话回到前台（leo r7 S1）：在切会话订阅排的微任务里跑。loadSession 换会话（setSession）和恢复输入框
 * （restoreComposerForSession）在同一段同步代码里，微任务跑时 store 里已是恢复好的稿，用户还没法动输入框。
 * - 正在组字：不判，等 compositionend（组字结束可能把切走前的旧组字稿写进 store，实机 11 / 14），之后照常放回。
 * - 恢复的稿里已有这一整段（和图）：删记录，什么都不写。之后用户改了那行 / 清空了，都是用户的意思，不再追加、不复活。
 * - 没有（重启后恢复的稿丢了原话等）：按行并进去再删记录。只看 store：React 可能还没把新会话的稿画进 DOM，
 *   DOM 里可能还是上一个会话的字，不能拿它合并；DOM 已经是恢复的稿时才顺手同步 DOM。回写锁 / 建会话中写不了就交给轮询。
 * 失败只记日志，记录不动，轮询兜底。
 */
function settleParkedOnReturn(sessionId: string): void {
  try {
    const rec = readPendingRewind(sessionId)
    if (!rec?.parked) return
    const store = useChatStore.getState()
    if (store.sessionId !== sessionId) return
    if (isComposerComposing()) {
      waitForCompositionEnd(sessionId)
      return
    }
    const restored = store.composer
    const tray = new Set(listComposerAssets().map((asset) => asset.id))
    const missing = rec.assets.filter((asset) => asset?.id && !tray.has(asset.id))
    if (!textContainsBlock(restored, rec.text) || missing.length > 0) {
      if (!canWriteBackToComposer("merge", { expectSessionId: sessionId })) return
      const merged = mergeWritebackText(rec.text, restored)
      const domShowsRestored = composerInputEl()?.value === restored
      if (merged !== restored) store.setComposer(merged)
      if (domShowsRestored) syncComposerDom(merged, true)
      for (const asset of missing) queueComposerAsset(asset)
      flushPersistedDrafts()
    }
    clearPendingRewind(sessionId)
    runHook(sessionId, "composer")
  } catch (error) {
    console.warn("[rewind] settle parked text on return failed (will retry)", error)
  }
}

/** 到达时在组字：等这次组字结束（document 上冒泡，晚于 React 根上的 onCompositionEnd，store 已是组字结束后的稿）。 */
let compositionWait: { sessionId: string; off: () => void } | null = null

function stopCompositionWait(): void {
  compositionWait?.off()
  compositionWait = null
}

function waitForCompositionEnd(sessionId: string): void {
  stopCompositionWait()
  const doc = (globalThis as { document?: Pick<EventTarget, "addEventListener" | "removeEventListener"> }).document
  if (typeof doc?.addEventListener !== "function") return
  const onEnd = () => {
    stopCompositionWait()
    queueMicrotask(() => settleForegroundNow(sessionId))
  }
  doc.addEventListener("compositionend", onEnd)
  compositionWait = { sessionId, off: () => doc.removeEventListener?.("compositionend", onEnd) }
}

/** 组字刚结束：前台还是它、没在组字就立刻放一次（输入框此时是这个会话的，按 DOM 合并），不等轮询。 */
function settleForegroundNow(sessionId: string): void {
  if (useChatStore.getState().sessionId !== sessionId || isComposerComposing()) return
  try {
    const outcome = settlePendingRewind(sessionId)
    if (outcome === "composer" || outcome === "draft") runHook(sessionId, outcome)
  } catch (error) {
    console.warn("[rewind] put back pending text after composition failed (will retry)", error)
  }
}

/** 切会话那一下：新前台有停放的记录 → 重置 warned（轮询回到平时的间隔），微任务里立刻判。 */
function onForegroundSession(sessionId: string | null): void {
  if (compositionWait && compositionWait.sessionId !== sessionId) stopCompositionWait()
  if (!sessionId || !readPendingRewind(sessionId)?.parked) return
  if (warned) {
    warned = false
    // 正挂着的那一拍是 1000ms 的慢拍：重新排，组字结束后按平时的间隔接上。
    if (timer) clearTimeout(timer)
    timer = null
  }
  queueMicrotask(() => settleParkedOnReturn(sessionId))
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
    onForegroundSession(state.sessionId)
    ensurePendingRewindLoop()
  })
  ensurePendingRewindLoop()
}
