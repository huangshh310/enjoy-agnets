/**
 * 冷启动回灌：最新助手行已封 restart_abandoned 时补回挂 notice。
 * 只用已记住或信封 `restartNotice` 的真实码，禁止每次发明 restore_interrupted_running。
 * 第一次展示后记成 consumed，关掉或下次启动不再弹。consumed 按「那一轮助手行 id」记：
 * 同一会话第二次重启中断（新的一轮）要照样弹，不必刷新（jojo 巡检）。
 */
import { RESTART_ABANDONED_CODE, toolHasResultCode } from "@enjoy-agents/ipc-contract/desktop-notify"
import {
  isRestoreFamilyCode,
  type RestoreFamilyCode
} from "@enjoy-agents/ipc-contract/restore-codes"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"

type HydrateNoticeMessage = {
  id?: string
  role?: string
  tools?: ThreadToolCall[]
  restartNotice?: string
}

type StoredNotice = { code: RestoreFamilyCode; consumed: boolean; turnId?: string }

const memory = new Map<string, StoredNotice>()

function storage(): Storage | null {
  try {
    const local = globalThis.localStorage
    return local ?? null
  } catch {
    return null
  }
}

function storageKey(sessionId: string): string {
  return `enjoy.restartNotice.${sessionId}`
}

function readStored(sessionId: string): StoredNotice | undefined {
  const hit = memory.get(sessionId)
  if (hit) return hit
  const raw = storage()?.getItem(storageKey(sessionId))
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as { code?: string; consumed?: boolean; turnId?: string }
    if (!isRestoreFamilyCode(parsed.code)) return undefined
    const row: StoredNotice = {
      code: parsed.code,
      consumed: parsed.consumed === true,
      turnId: typeof parsed.turnId === "string" ? parsed.turnId : undefined
    }
    memory.set(sessionId, row)
    return row
  } catch {
    return undefined
  }
}

function writeStored(sessionId: string, row: StoredNotice): void {
  memory.set(sessionId, row)
  try {
    storage()?.setItem(storageKey(sessionId), JSON.stringify(row))
  } catch {
    // 无 localStorage 时只留内存，测试与无窗环境够用。
  }
}

export function rememberRestartNotice(sessionId: string, code: string): void {
  if (!sessionId || !isRestoreFamilyCode(code)) return
  const prev = readStored(sessionId)
  writeStored(sessionId, { code, consumed: prev?.consumed === true, turnId: prev?.turnId })
}

export function consumeRestartNotice(sessionId: string, turnId?: string): void {
  if (!sessionId) return
  const prev = readStored(sessionId)
  if (!prev) return
  writeStored(sessionId, { ...prev, consumed: true, turnId: turnId ?? prev.turnId })
}

export function lastRestartNotice(sessionId: string): RestoreFamilyCode | undefined {
  return readStored(sessionId)?.code
}

export function isRestartNoticeConsumed(sessionId: string, turnId?: string): boolean {
  const row = readStored(sessionId)
  if (row?.consumed !== true) return false
  // 记过那一轮、这次最新助手行换了：是新的一次中断，不算已看过。
  if (turnId && row.turnId && row.turnId !== turnId) return false
  return true
}

export function resetRestartNoticeForTest(): void {
  memory.clear()
}

export function latestAssistantRestartAbandoned(messages: HydrateNoticeMessage[]): boolean {
  const last = latestAssistant(messages)
  return Boolean(last?.tools?.some((tool) => toolHasResultCode(tool, RESTART_ABANDONED_CODE)))
}

export function latestAssistantRestartNotice(messages: HydrateNoticeMessage[]): RestoreFamilyCode | undefined {
  const code = latestAssistant(messages)?.restartNotice
  return isRestoreFamilyCode(code) ? code : undefined
}

function latestAssistant(messages: HydrateNoticeMessage[]): HydrateNoticeMessage | undefined {
  return [...messages].reverse().find((message) => message.role === "assistant")
}

export function noticeAfterRestartHydrate(input: {
  sessionId?: string
  sameSession: boolean
  running: boolean
  notice: string | null
  messages: HydrateNoticeMessage[]
}): string | null {
  const sessionId = input.sessionId ?? ""
  if (input.sameSession || input.running) return input.notice
  const turnId = latestAssistant(input.messages)?.id
  if (input.notice) {
    if (isRestoreFamilyCode(input.notice) && sessionId) {
      rememberRestartNotice(sessionId, input.notice)
      consumeRestartNotice(sessionId, turnId)
    }
    return input.notice
  }
  if (!sessionId || isRestartNoticeConsumed(sessionId, turnId)) return input.notice
  if (!latestAssistantRestartAbandoned(input.messages)) return input.notice
  const code = lastRestartNotice(sessionId) ?? latestAssistantRestartNotice(input.messages)
  if (!isRestoreFamilyCode(code)) return input.notice
  rememberRestartNotice(sessionId, code)
  consumeRestartNotice(sessionId, turnId)
  return code
}

export function keepRestoreFamilyNotice(notice: string | null | undefined): string | null {
  return isRestoreFamilyCode(notice) ? notice : null
}
