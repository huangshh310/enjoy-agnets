/**
 * Attention 纯函数：事件 → 槽位 upsert / 收束。一槽一位。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { ASK_USER_QUESTIONS_TOOL } from "@enjoy-agents/ipc-contract/tool-names"
import type { AttentionItem, AttentionKind, IngestAttentionInput } from "./attention.types"

/** complete 短时展示后自消，不计入红点。 */
export const COMPLETE_TTL_MS = 10_000

export const KIND_PRIORITY: Record<AttentionKind, number> = {
  pending_approval: 0,
  ask_user: 1,
  error: 2,
  complete: 3
}

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
  const aged = expireStaleCompletes(items, now)
  if (input.event.type === "approval.resolved") {
    return resolveDecisionSlots(aged, input.sessionId, eventRunId(input.event))
  }
  const kind = attentionKindFromEvent(input.event)
  if (!kind) return aged
  const cleared =
    kind === "complete" || kind === "error"
      ? resolveDecisionSlots(aged, input.sessionId, eventRunId(input.event))
      : kind === "pending_approval" || kind === "ask_user"
        ? resolveTerminalSlots(aged, input.sessionId)
        : aged
  const next = upsertSlot(cleared, {
    sessionId: input.sessionId,
    workspaceId: input.workspaceId,
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

/** 新审批进场时收掉同会话的已完成 / 出错，避免「需处理」和「已完成刚刚」叠在一起。 */
export function resolveTerminalSlots(items: AttentionItem[], sessionId: string): AttentionItem[] {
  return items.map((item) => {
    if (item.sessionId !== sessionId) return item
    if (item.kind !== "complete" && item.kind !== "error") return item
    if (item.status === "resolved" || item.status === "dismissed" || item.status === "expired") {
      return item
    }
    return { ...item, status: "resolved" }
  })
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

/** Strip 画 active/focused；当前会话决策面在 Dock，胶囊收成微点。 */
export function stripVisibleItems(items: AttentionItem[]): AttentionItem[] {
  return sortByPriority(
    items.filter((item) => item.status === "active" || item.status === "focused")
  )
}

export function stripNeedsCount(items: AttentionItem[]): number {
  return stripVisibleItems(items).filter((item) => item.kind !== "complete").length
}

/** Inbox 轨徽标只要拍板（pending_approval / ask_user），不计失败 / 完成 / 运行中。 */
export function stripApprovalCount(items: AttentionItem[]): number {
  return stripVisibleItems(items).filter(
    (item) => item.kind === "pending_approval" || item.kind === "ask_user"
  ).length
}

export function isStripCompact(
  item: AttentionItem,
  currentSessionId: string | null,
  isChat: boolean,
  dockOpen: boolean
): boolean {
  if (!isChat || !dockOpen || item.sessionId !== currentSessionId) return false
  return item.kind === "pending_approval" || item.kind === "ask_user"
}

export function expireStaleCompletes(items: AttentionItem[], now: number): AttentionItem[] {
  return items.map((item) => {
    if (item.kind !== "complete" || item.status !== "active") return item
    if (now - item.occurredAt < COMPLETE_TTL_MS) return item
    return { ...item, status: "expired" }
  })
}

export function hasLiveComplete(items: AttentionItem[]): boolean {
  return items.some((item) => item.kind === "complete" && item.status === "active")
}

function sortByPriority(items: AttentionItem[]): AttentionItem[] {
  return [...items].sort((left, right) => {
    const rank = KIND_PRIORITY[left.kind] - KIND_PRIORITY[right.kind]
    if (rank !== 0) return rank
    return right.occurredAt - left.occurredAt
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
  return items.map((item, i) => (i === index ? { ...next, workspaceId: next.workspaceId ?? item.workspaceId } : item))
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
