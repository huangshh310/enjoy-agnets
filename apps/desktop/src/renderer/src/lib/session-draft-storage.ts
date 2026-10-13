/**
 * jojo / luna：未发出的草稿按会话落盘，重启后还在；发出成功（输入框清空）才清。
 * 只存正文（附件 / 引用仍是内存草稿）。键是 sessionId；sessionId 为空（新对话创建窗）不存，与会话草稿互不串。
 */
import { useChatStore } from "../stores/chat-store"
import type { SessionDraftState } from "../stores/chat-store.types"

const STORAGE_KEY = "enjoy-agents-session-drafts"

type DraftMap = Record<string, string>

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function readAll(): DraftMap {
  const raw = storage()?.getItem(STORAGE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === "object" ? (parsed as DraftMap) : {}
  } catch {
    return {}
  }
}

function writeAll(map: DraftMap): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // 配额满等：只丢落盘，不影响内存草稿。
  }
}

export function readPersistedDraft(sessionId: string): string | undefined {
  const text = readAll()[sessionId]
  return typeof text === "string" && text ? text : undefined
}

export function writePersistedDraft(sessionId: string, text: string): void {
  const map = readAll()
  if (text.trim()) {
    if (map[sessionId] === text) return
    map[sessionId] = text
  } else {
    if (!(sessionId in map)) return
    delete map[sessionId]
  }
  writeAll(map)
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
  installed = () => {
    unsubscribe()
    installed = null
  }
  return installed
}
