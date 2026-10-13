/**
 * jojo / luna：未发出的草稿按会话落盘，重启后还在；发出成功（输入框清空）才清。
 * 只存正文（附件 / 引用仍是内存草稿）。键是 sessionId；sessionId 为空（新对话创建窗）不存，与会话草稿互不串。
 */
import { useChatStore } from "../stores/chat-store"
import type { SessionDraftState } from "../stores/chat-store.types"

const STORAGE_KEY = "enjoy-agents-session-drafts"
/** 打字防抖：停手这么久后写到 main（DB）。 */
export const DRAFT_PERSIST_DEBOUNCE_MS = 300

type DraftMap = Record<string, string>

type DraftBridge = {
  loadSync: () => DraftMap
  save: (input: { sessionId: string; text: string }) => void
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

/** 打开会话时的稿：内存草稿优先（带附件 / 引用）；没有就用落盘的正文（重启后）。 */
export function composerDraftForSession(sessionId: string): SessionDraftState | undefined {
  const memory = useChatStore.getState().getSessionDraft(sessionId)
  if (memory) return memory
  const persisted = readPersistedDraft(sessionId)
  return persisted ? { text: persisted } : undefined
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
  const onHide = () => flushPersistedDrafts()
  globalThis.addEventListener?.("pagehide", onHide)
  globalThis.addEventListener?.("beforeunload", onHide)
  installed = () => {
    unsubscribe()
    globalThis.removeEventListener?.("pagehide", onHide)
    globalThis.removeEventListener?.("beforeunload", onHide)
    installed = null
  }
  return installed
}
