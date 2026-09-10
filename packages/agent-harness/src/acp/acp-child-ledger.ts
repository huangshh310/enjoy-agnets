/**
 * ACP 子进程账本：强杀 Enjoy 后启动时按 pid+命令核对再收尸。
 * 不碰 fs；存盘在 acp-child-store。
 */
import { basename } from "node:path"

export type AcpChildRecord = {
  pid: number
  toolId: string
  command: string
  startedAt: number
}

export function parseAcpChildLedger(raw: string): AcpChildRecord[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => toRecord(item) ?? [])
  } catch {
    return []
  }
}

export function serializeAcpChildLedger(rows: AcpChildRecord[]): string {
  return JSON.stringify(rows)
}

export function upsertAcpChild(rows: AcpChildRecord[], next: AcpChildRecord): AcpChildRecord[] {
  return [...rows.filter((row) => row.pid !== next.pid), next]
}

export function removeAcpChild(rows: AcpChildRecord[], pid: number): AcpChildRecord[] {
  return rows.filter((row) => row.pid !== pid)
}

/** pid 仍在、且 comm 对得上我们当时 spawn 的 basename，才允许杀。pid 复用则放过。 */
export function shouldReapAcpChild(
  record: AcpChildRecord,
  live: { exists: boolean; comm: string | null }
): boolean {
  if (!live.exists || record.pid <= 1) return false
  if (record.pid === process.pid) return false
  if (!live.comm) return false
  return commandNamesMatch(live.comm, record.command)
}

export function commandNamesMatch(comm: string, command: string): boolean {
  const left = basename(comm.replace(/\\/g, "/")).toLowerCase()
  const right = basename(command.replace(/\\/g, "/")).toLowerCase()
  if (!left || !right) return false
  if (left === right) return true
  return left === `${right}.exe` || right === `${left}.exe`
}

function toRecord(item: unknown): AcpChildRecord | null {
  if (!item || typeof item !== "object") return null
  const row = item as Record<string, unknown>
  const pid = Number(row.pid)
  if (!Number.isInteger(pid) || pid <= 0) return null
  if (typeof row.toolId !== "string" || typeof row.command !== "string") return null
  const startedAt = typeof row.startedAt === "number" ? row.startedAt : 0
  return { pid, toolId: row.toolId, command: row.command, startedAt }
}
