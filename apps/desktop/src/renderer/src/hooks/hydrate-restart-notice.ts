/**
 * 冷启动回灌：最新助手行已封 restart_abandoned 时补回挂 notice。
 * 只用已记住或信封 `restartNotice` 的真实码，禁止每次发明 restore_interrupted_running。
 * 第一次展示后记成 consumed，关掉或下次启动不再弹。
 */
import { RESTART_ABANDONED_CODE, toolHasResultCode } from "@enjoy-agents/ipc-contract/desktop-notify"
import {
  isRestoreFamilyCode,
  type RestoreFamilyCode
} from "@enjoy-agents/ipc-contract/restore-codes"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"

type HydrateNoticeMessage = {
  role?: string
  tools?: ThreadToolCall[]
  restartNotice?: string
}

const memory = new Map<string, { code: RestoreFamilyCode; consumed: boolean }>()

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

function readStored(sessionId: string): { code: RestoreFamilyCode; consumed: boolean } | undefined {
  const hit = memory.get(sessionId)
  if (hit) return hit
  const raw = storage()?.getItem(storageKey(sessionId))
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as { code?: string; consumed?: boolean }
    if (!isRestoreFamilyCode(parsed.code)) return undefined
    const row = { code: parsed.code, consumed: parsed.consumed === true }
    memory.set(sessionId, row)
    return row
  } catch {
    return undefined
  }
}

function writeStored(sessionId: string, row: { code: RestoreFamilyCode; consumed: boolean }): void {
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
  writeStored(sessionId, { code, consumed: prev?.consumed === true })
}

export function consumeRestartNotice(sessionId: string): void {
  if (!sessionId) return
  const prev = readStored(sessionId)
  if (!prev) return
  writeStored(sessionId, { ...prev, consumed: true })
}

export function lastRestartNotice(sessionId: string): RestoreFamilyCode | undefined {
  return readStored(sessionId)?.code
}

export function isRestartNoticeConsumed(sessionId: string): boolean {
  return readStored(sessionId)?.consumed === true
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
  if (input.notice) {
    if (isRestoreFamilyCode(input.notice) && sessionId) {
      rememberRestartNotice(sessionId, input.notice)
      consumeRestartNotice(sessionId)
    }
    return input.notice
  }
  if (!sessionId || isRestartNoticeConsumed(sessionId)) return input.notice
  if (!latestAssistantRestartAbandoned(input.messages)) return input.notice
  const code = lastRestartNotice(sessionId) ?? latestAssistantRestartNotice(input.messages)
  if (!isRestoreFamilyCode(code)) return input.notice
  rememberRestartNotice(sessionId, code)
  consumeRestartNotice(sessionId)
  return code
}

export function keepRestoreFamilyNotice(notice: string | null | undefined): string | null {
  return isRestoreFamilyCode(notice) ? notice : null
}
