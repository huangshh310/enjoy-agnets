/**
 * Attention 纯函数：事件 → 槽位 upsert / 收束。一槽一位。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import type { AttentionItem, AttentionKind, IngestAttentionInput } from "./attention.types"

/** 与 ipc-contract 同值；node:test 不要 value-import 合约入口。 */
const ASK_USER_QUESTIONS_TOOL = "ask_user_questions"

/** complete 超过此时长标 expired，不再占 Strip。 */
export const COMPLETE_TTL_MS = 30 * 60 * 1000

export function attentionSlotId(sessionId: string, kind: AttentionKind): string {
  return `${sessionId}:${kind}`
}

export function attentionKindFromEvent(event: StreamEvent): AttentionKind | null {
  if (event.type === "approval.required") {
    return event.name === ASK_USER_QUESTIONS_TOOL ? "ask_user" : "pending_approval"
  }
  if (event.type === "run.error") return "error"
  if (event.type === "run.end") return "complete"
  return null
}

export function eventRunId(event: StreamEvent): string | undefined {
  return "runId" in event ? event.runId : undefined
}

/** 把一条流事件折进槽表；同 (sessionId, kind) 覆盖。 */
export function ingestAttentionEvent(
  items: AttentionItem[],
  input: IngestAttentionInput
): AttentionItem[] {
  const now = input.now ?? Date.now()
  const aged = expireStaleComplete(items, now)
  if (input.event.type === "approval.resolved") {
    return resolveDecisionSlots(aged, input.sessionId, eventRunId(input.event))
  }
  const kind = attentionKindFromEvent(input.event)
  if (!kind) return aged
  const cleared =
    kind === "complete" || kind === "error"
      ? resolveDecisionSlots(aged, input.sessionId, eventRunId(input.event))
      : aged
  const next = upsertSlot(cleared, {
    sessionId: input.sessionId,
    sessionTitle: input.sessionTitle,
    kind,
    runId: eventRunId(input.event) ?? "",
    occurredAt: now,
    summary: summaryFor(kind, input),
    approval: input.event.type === "approval.required" ? input.event : undefined,
    errorMessage: input.event.type === "run.error" ? input.event.message : undefined
  })
  return next
}

export function focusAttentionSlot(
  items: AttentionItem[],
  sessionId: string,
  kind?: AttentionKind
): AttentionItem[] {
  return items.map((item) => {
    if (item.sessionId !== sessionId) return item
    if (kind && item.kind !== kind) return item
    if (item.status !== "active" && item.status !== "focused") return item
    if (item.kind === "complete") return { ...item, status: "resolved" }
    return { ...item, status: "focused" }
  })
}

export function dismissAttentionSlot(items: AttentionItem[], id: string): AttentionItem[] {
  return items.map((item) => (item.id === id ? { ...item, status: "dismissed" } : item))
}

export function resolveDecisionSlots(
  items: AttentionItem[],
  sessionId: string,
  runId?: string
): AttentionItem[] {
  return items.map((item) => {
    if (item.sessionId !== sessionId) return item
    if (item.kind !== "pending_approval" && item.kind !== "ask_user") return item
    if (item.status === "resolved" || item.status === "dismissed" || item.status === "expired") {
      return item
    }
    if (runId && item.runId && item.runId !== runId) return item
    return { ...item, status: "resolved" }
  })
}

/** Strip 只画需要跳走的 active；当前 Chat 会话由 Dock 接，不重复占条。 */
export function stripVisibleItems(
  items: AttentionItem[],
  currentSessionId: string | null,
  isChat: boolean
): AttentionItem[] {
  return items.filter((item) => {
    if (item.status !== "active") return false
    if (isChat && item.sessionId === currentSessionId) return false
    return true
  })
}

function expireStaleComplete(items: AttentionItem[], now: number): AttentionItem[] {
  return items.map((item) => {
    if (item.kind !== "complete" || item.status !== "active") return item
    if (now - item.occurredAt < COMPLETE_TTL_MS) return item
    return { ...item, status: "expired" }
  })
}

function upsertSlot(
  items: AttentionItem[],
  slot: Omit<AttentionItem, "id" | "status">
): AttentionItem[] {
  const id = attentionSlotId(slot.sessionId, slot.kind)
  const next: AttentionItem = { ...slot, id, status: "active" }
  const index = items.findIndex((item) => item.id === id)
  if (index < 0) return [...items, next]
  return items.map((item, i) => (i === index ? next : item))
}

function summaryFor(kind: AttentionKind, input: IngestAttentionInput): string {
  const title = input.sessionTitle
  if (kind === "pending_approval" && input.event.type === "approval.required") {
    return `${title} · ${input.event.name}`
  }
  if (kind === "ask_user") return title
  if (kind === "error" && input.event.type === "run.error") return input.event.message
  return title
}
