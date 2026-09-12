/**
 * Inbox 档案持久化：已读 / 隐藏状态 + error/complete 条目归档。
 * 合并语义：put 只覆盖传入的标志，未传的保留原值。
 */
import {
  InboxStateListInput,
  InboxStatePutInput,
  type InboxArchivedItem,
  type InboxStateListResult
} from "@enjoy-agents/ipc-contract"
import {
  deleteHiddenInboxStatesBefore,
  getInboxState,
  listInboxStates,
  upsertInboxState
} from "@enjoy-agents/db"
import { getDatabase } from "./database"

const HIDDEN_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export function listInboxStateRows(_raw: unknown): InboxStateListResult {
  InboxStateListInput.parse(_raw ?? {})
  const db = getDatabase()
  deleteHiddenInboxStatesBefore(db, Date.now() - HIDDEN_RETENTION_MS)
  return {
    entries: listInboxStates(db).map((row) => ({
      id: row.id,
      readAt: row.readAt,
      hiddenAt: row.hiddenAt,
      item: parseItem(row.itemJson)
    }))
  }
}

export function putInboxStates(raw: unknown): { ok: true } {
  const input = InboxStatePutInput.parse(raw)
  const db = getDatabase()
  for (const entry of input.entries) {
    const current = getInboxState(db, entry.id)
    const readAt =
      entry.read === undefined
        ? (current?.readAt ?? null)
        : entry.read
          ? Date.now()
          : null
    const hiddenAt =
      entry.hidden === undefined
        ? (current?.hiddenAt ?? null)
        : entry.hidden
          ? Date.now()
          : null
    const itemJson =
      entry.item !== undefined ? JSON.stringify(entry.item) : (current?.itemJson ?? null)
    upsertInboxState(db, { id: entry.id, readAt, hiddenAt, itemJson })
  }
  return { ok: true }
}

function parseItem(raw: string | null): InboxArchivedItem | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as InboxArchivedItem
  } catch {
    return null
  }
}
