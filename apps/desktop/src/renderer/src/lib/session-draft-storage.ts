/**
 * jojo / luna：未发出的草稿按会话落盘，重启后还在；发出成功（输入框清空）才清。
 * 只存正文（附件 / 引用仍是内存草稿）。键是 sessionId；sessionId 为空（新对话创建窗）不存，与会话草稿互不串。
 */
import { useChatStore } from "../stores/chat-store"
import { listFollowups } from "../hooks/followup-queue"
import { listComposerAssets, setComposerAssetPersister } from "../hooks/composer-assets"
import type { SessionDraftState } from "../stores/chat-store.types"
import { mergeComposerText } from "./merge-composer-text"

const STORAGE_KEY = "enjoy-agents-session-drafts"
/** 打字防抖：停手这么久后写到 main（DB）。 */
export const DRAFT_PERSIST_DEBOUNCE_MS = 300

type DraftMap = Record<string, string>

type DraftAsset = {
  id: string
  name: string
  mediaType?: string
  size?: number
  /** leo #155：已随排队项走的图——输入框 / 草稿恢复一律不认；发出或删排队项才清。 */
  queued?: { itemId: string; text: string }
}

type DraftBridge = {
  loadSync: () => DraftMap
  save: (input: { sessionId: string; text: string }) => void
  loadAssetsSync?: () => Record<string, DraftAsset[]>
  saveAssets?: (input: { sessionId: string; assets: DraftAsset[] }) => void
}

/**
 * jojo P1：落盘走 main（DB，已提交即强杀不丢）；renderer localStorage 在 SIGKILL 下不可靠，只作无桥（单测）回落。
 */
function bridge(): DraftBridge {
  const ide = (globalThis as { window?: { ide?: { session?: { drafts?: DraftBridge } } } }).window?.ide
  const drafts = ide?.session?.drafts
  if (drafts) return drafts
  return {
    loadSync: () => {
      try {
        const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
        const parsed = raw ? (JSON.parse(raw) as unknown) : {}
        return parsed && typeof parsed === "object" ? (parsed as DraftMap) : {}
      } catch {
        return {}
      }
    },
    save: ({ sessionId, text }) => {
      try {
        const store = globalThis.localStorage
        if (!store) return
        const raw = store.getItem(STORAGE_KEY)
        const map = (raw ? JSON.parse(raw) : {}) as DraftMap
        if (text.trim()) map[sessionId] = text
        else delete map[sessionId]
        store.setItem(STORAGE_KEY, JSON.stringify(map))
      } catch {
        // 配额满等：只丢落盘
      }
    }
  }
}

let cache: DraftMap | null = null
const pending = new Map<string, string>()
let timer: ReturnType<typeof setTimeout> | null = null

function drafts(): DraftMap {
  if (!cache) {
    try {
      cache = { ...bridge().loadSync() }
    } catch {
      cache = {}
    }
  }
  return cache
}

/** 把防抖中的写立刻送到 main（关窗 / 测试用）。 */
export function flushPersistedDrafts(): void {
  if (timer) clearTimeout(timer)
  timer = null
  const target = bridge()
  for (const [sessionId, text] of pending) target.save({ sessionId, text })
  pending.clear()
}

/** 测试用：丢掉内存缓存，下次从后端重读（模拟重启）。 */
export function resetPersistedDraftCacheForTest(): void {
  emptyHolds.clear()
  if (timer) clearTimeout(timer)
  timer = null
  pending.clear()
  cache = null
}

export function readPersistedDraft(sessionId: string): string | undefined {
  const text = drafts()[sessionId]
  return typeof text === "string" && text ? text : undefined
}

/**
 * leo：发送途中输入框清空产生的 "" 不落 main——消息落库前强杀会丢稿。
 * 由 main 在用户消息落库同一事务里清（完全相同才清）；发出后再由 releaseEmptyDraftHold 补一次 ""。
 */
const emptyHolds = new Set<string>()

export function holdEmptyDraftWrite(sessionId: string): void {
  emptyHolds.add(sessionId)
}

/** 发送收尾：launched=消息已交给 main（已落库）→ 若此刻仍是空稿，补发 ""。 */
export function releaseEmptyDraftHold(sessionId: string, launched: boolean): void {
  if (!emptyHolds.delete(sessionId)) return
  if (!launched) return
  if (drafts()[sessionId]) return
  pending.set(sessionId, "")
  if (timer) clearTimeout(timer)
  timer = setTimeout(flushPersistedDrafts, DRAFT_PERSIST_DEBOUNCE_MS)
}

export function writePersistedDraft(sessionId: string, text: string): void {
  const map = drafts()
  if (text.trim()) {
    if (map[sessionId] === text) return
    map[sessionId] = text
  } else {
    if (!(sessionId in map)) return
    delete map[sessionId]
    if (emptyHolds.has(sessionId)) {
      pending.delete(sessionId)
      return
    }
  }
  pending.set(sessionId, text.trim() ? text : "")
  if (timer) clearTimeout(timer)
  timer = setTimeout(flushPersistedDrafts, DRAFT_PERSIST_DEBOUNCE_MS)
}

let assetCache: Record<string, DraftAsset[]> | null = null

function draftAssets(): Record<string, DraftAsset[]> {
  if (!assetCache) {
    try {
      assetCache = { ...bridge().loadAssetsSync?.() }
    } catch {
      assetCache = {}
    }
  }
  return assetCache
}

export function readPersistedDraftAssets(sessionId: string): DraftAsset[] | undefined {
  const list = (draftAssets()[sessionId] ?? []).filter((a) => !a.queued)
  return list.length > 0 ? list : undefined
}

function queuedEntries(sessionId: string): DraftAsset[] {
  return (draftAssets()[sessionId] ?? []).filter((a) => a.queued)
}

function writeDraftAssetRows(sessionId: string, rows: DraftAsset[]): void {
  const map = draftAssets()
  if (rows.length > 0) map[sessionId] = rows
  else delete map[sessionId]
  try {
    bridge().saveAssets?.({ sessionId, assets: rows })
  } catch {
    // 只丢持久化
  }
}

/** jojo P1：草稿附件按**这个**会话落库（只粘图的新会话不是空壳；绝不挂到别的会话）。排队标记的图原样保留。 */
export function writePersistedDraftAssets(sessionId: string, assets: DraftAsset[]): void {
  if (!sessionId) return
  const clean = assets.map((a) => ({ id: a.id, name: a.name, mediaType: a.mediaType, size: a.size }))
  const ids = new Set(clean.map((a) => a.id))
  writeDraftAssetRows(sessionId, [...clean, ...queuedEntries(sessionId).filter((a) => !ids.has(a.id))])
}

/**
 * leo MUST 1（#155）：入队不删草稿附件，只打上排队标记（马上发失败 / 崩溃都不丢）；
 * 输入框和切回恢复不认带标记的图（jojo P2：不冒只图草稿）。
 */
export function markDraftAssetsQueued(
  sessionId: string,
  itemId: string,
  text: string,
  assets: readonly DraftAsset[]
): void {
  if (!sessionId || assets.length === 0) return
  const ids = new Set(assets.map((a) => a.id))
  const rest = (draftAssets()[sessionId] ?? []).filter((a) => !ids.has(a.id))
  const marked = assets.map((a) => ({
    id: a.id,
    name: a.name,
    mediaType: a.mediaType,
    size: a.size,
    queued: { itemId, text }
  }))
  writeDraftAssetRows(sessionId, [...rest, ...marked])
}

/** 排队项被删 / 已发出（main 已在落库事务里清）/ 退回输入框：去掉这一项的排队标记行。 */
export function releaseQueuedDraftAssets(sessionId: string, itemId: string): void {
  const rows = draftAssets()[sessionId] ?? []
  const rest = rows.filter((a) => a.queued?.itemId !== itemId)
  if (rest.length !== rows.length) writeDraftAssetRows(sessionId, rest)
}

/**
 * 重启后队列没了（只在内存）：库里还挂着排队标记的图不能悄悄丢——连同那条的字退回这个会话的草稿。
 * 进程内队列还在的项不动。
 */
export function returnOrphanQueuedAssets(sessionId: string): { text: string } | undefined {
  const rows = draftAssets()[sessionId] ?? []
  const alive = new Set(listFollowups(sessionId).map((item) => item.id))
  const orphans = rows.filter((a) => a.queued && !alive.has(a.queued.itemId))
  if (orphans.length === 0) return undefined
  const texts: string[] = []
  for (const row of orphans) {
    const text = row.queued!.text.trim()
    if (text && !texts.includes(text)) texts.push(text)
  }
  writeDraftAssetRows(
    sessionId,
    rows.map((a) => (a.queued && !alive.has(a.queued.itemId) ? { id: a.id, name: a.name, mediaType: a.mediaType, size: a.size } : a))
  )
  return { text: texts.join("\n\n") }
}

/**
 * leo：发送已被 main 接手（main 在用户消息落库事务里清了库里的草稿附件）——renderer 缓存也丢掉，
 * 否则切走再切回，旧图会从缓存冒回输入框。只清缓存，不再往 main 写。
 */
export function forgetPersistedDraftAssets(sessionId: string | null | undefined): void {
  if (!sessionId || !assetCache) return
  // 排队标记的图还挂在别的排队项上，缓存里留着（库里也还在）。
  const queued = (assetCache[sessionId] ?? []).filter((a) => a.queued)
  if (queued.length > 0) assetCache[sessionId] = queued
  else delete assetCache[sessionId]
}

/**
 * leo：建会话窗里（还没有 sessionId）粘的图只在内存；会话一建好就落到**这个**会话的草稿附件，
 * 强杀 / 切走不丢，也不会被当空会话清掉。有排队首发时附件随发送走，不落草稿。
 */
export function persistCreateWindowAssets(sessionId: string): void {
  const assets = listComposerAssets()
  if (assets.length > 0) writePersistedDraftAssets(sessionId, assets)
}

export function resetPersistedDraftAssetsForTest(): void {
  assetCache = null
}

/**
 * luna：内存草稿里的附件预览是 blob: URL，离开会话（新对话 / 清输入框）时会被 revoke，切回来缩略图就坏了。
 * 恢复时丢掉 blob: 预览，让缩略图按 asset id 从资产库重读（和重启后的落盘恢复同一条路）。
 */
export function withoutBlobPreviews<T extends { url?: string }>(assets: T[]): T[] {
  return assets.map((asset) => {
    if (!asset.url?.startsWith("blob:")) return asset
    const rest = { ...asset }
    delete rest.url
    return rest
  })
}

/** 打开会话时的稿：内存草稿优先（带附件 / 引用）；没有就用落盘的正文 + 附件（重启后）。 */
export function composerDraftForSession(sessionId: string): SessionDraftState | undefined {
  const memory = useChatStore.getState().getSessionDraft(sessionId)
  if (memory) return memory.assets?.length ? { ...memory, assets: withoutBlobPreviews(memory.assets) } : memory
  const orphan = returnOrphanQueuedAssets(sessionId)
  const saved = readPersistedDraft(sessionId)
  const persisted = orphan?.text && !(saved ?? "").includes(orphan.text)
    ? [saved, orphan.text].filter(Boolean).join("\n\n")
    : saved
  const assets = readPersistedDraftAssets(sessionId)
  if (!persisted && !assets) return undefined
  return { text: persisted ?? "", ...(assets ? { assets } : {}) }
}

/**
 * leo r3 M4：发出后马上切走，出字前失败在后台回滚——main 已在回滚事务里把正文写回 session_drafts、
 * 图并回 session_draft_assets。renderer 这边的缓存（正文 cache / 附件 assetCache / 内存草稿）还是发送时的旧样子：
 * 从 main 重读并与本地（防抖中的写、内存草稿）合并，写回缓存；本地多出来的再写回 main。
 * 否则切回时内存草稿（空）盖住还回的稿，之后一次整行替换的 saveAssets 也会把还回的图丢掉。
 */
export function refreshDraftAfterBackgroundRollback(sessionId: string): void {
  if (!sessionId) return
  const target = bridge()
  let mainText = ""
  let mainAssets: DraftAsset[] = []
  try {
    mainText = target.loadSync()[sessionId] ?? ""
  } catch {
    mainText = ""
  }
  try {
    mainAssets = target.loadAssetsSync?.()[sessionId] ?? []
  } catch {
    mainAssets = []
  }
  const store = useChatStore.getState()
  const memory = store.getSessionDraft(sessionId)

  // 防抖中的写最新，但发出时挂的是空稿 ""：空的不算，回落内存草稿。
  const pendingText = pending.get(sessionId)
  const localText = pendingText?.trim() ? pendingText : (memory?.text ?? "")
  const text = mergeComposerText(mainText, localText)
  const map = drafts()
  if (text.trim()) map[sessionId] = text
  else delete map[sessionId]
  if (text === mainText) {
    // 防抖中的 ""（发出时的空稿）不得再落 main 把还回的稿删掉。
    pending.delete(sessionId)
  } else {
    pending.set(sessionId, text)
    if (timer) clearTimeout(timer)
    timer = setTimeout(flushPersistedDrafts, DRAFT_PERSIST_DEBOUNCE_MS)
  }

  // leo r4 B1：main 回的是整行，含排队项的图（带 queued 标记）。那些属于排队项，不是还回的稿：
  // 单独留着、原样保留标记写回缓存，不并进普通草稿、不进内存草稿（否则切回会冒出来，再发一遍）。
  const mainQueued = mainAssets.filter((a) => a?.queued)
  const queuedIds = new Set(mainQueued.map((a) => a.id))
  const mainNormal = mainAssets.filter((a) => !a?.queued)
  const localAssets = ((memory?.assets ?? assetCache?.[sessionId] ?? []) as DraftAsset[]).filter((a) => !a?.queued)
  const seen = new Set<string>(queuedIds)
  const assets: DraftAsset[] = []
  for (const asset of [...localAssets, ...mainNormal]) {
    if (!asset?.id || seen.has(asset.id)) continue
    seen.add(asset.id)
    assets.push({ id: asset.id, name: asset.name, mediaType: asset.mediaType, size: asset.size })
  }
  const cacheMap = draftAssets()
  const rows = [...assets, ...mainQueued]
  if (rows.length > 0) cacheMap[sessionId] = rows
  else delete cacheMap[sessionId]
  if (assets.length !== mainNormal.length) writePersistedDraftAssets(sessionId, assets)

  if (memory) {
    store.saveSessionDraft(sessionId, { ...memory, text, assets })
  }
}

/** 后台会话的出字前回滚（main 删了用户句）才需要重读草稿；保留用户句（keptUserMessage）的不用。 */
export function noteBackgroundRunError(
  sessionId: string | undefined,
  event: { type: string; preOutput?: boolean; keptUserMessage?: boolean }
): boolean {
  if (!sessionId || event.type !== "run.error" || event.preOutput !== true || event.keptUserMessage === true) return false
  refreshDraftAfterBackgroundRollback(sessionId)
  return true
}

let installed: (() => void) | null = null

/** 输入框正文随会话落盘：只在同一会话内的改动才写，切会话那一刻不写（避免把旧稿抄进新会话）。 */
export function installSessionDraftPersistence(): () => void {
  if (installed) return installed
  const unsubscribe = useChatStore.subscribe((state, prev) => {
    if (state.composer === prev.composer) return
    if (!state.sessionId || state.sessionId !== prev.sessionId) return
    writePersistedDraft(state.sessionId, state.composer)
  })
  setComposerAssetPersister((items) => {
    const sid = useChatStore.getState().sessionId
    if (sid) writePersistedDraftAssets(sid, items)
  })
  const onHide = () => flushPersistedDrafts()
  globalThis.addEventListener?.("pagehide", onHide)
  globalThis.addEventListener?.("beforeunload", onHide)
  installed = () => {
    unsubscribe()
    setComposerAssetPersister(null)
    globalThis.removeEventListener?.("pagehide", onHide)
    globalThis.removeEventListener?.("beforeunload", onHide)
    installed = null
  }
  return installed
}
