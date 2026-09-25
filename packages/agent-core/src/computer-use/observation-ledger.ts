/**
 * Computer Use 观察账本：一次快照一个编号，用过或过期都不能再点。
 * 待批可冻结 TTL 时钟（累计 frozenMs），不靠加长 30s 常数。
 * 不碰系统 API，三端共用。
 */

export const OBSERVATION_TTL_MS = 30_000

export type ObservationElement = {
  id: string
  role: string
  name: string
  value?: string
  clickable: boolean
}

export type Observation = {
  id: string
  pid: number
  windowId: string
  appName: string
  /** 会话 Allow 键；bundleId → exe/AUMID → 规范化 appName。pid 不是键。 */
  appKey?: string
  bundleId?: string
  exe?: string
  aumid?: string
  elements: ObservationElement[]
  createdAt: number
  platform: string
  thumbnailPath?: string
}

export type StaleCause = "missing" | "spent" | "expired"

export type TakeObservation =
  | { ok: true; observation: Observation }
  | { ok: false; code: "stale_observation"; cause: StaleCause }

type LedgerRow = {
  observation: Observation
  spent: boolean
  frozenAt: number | null
  frozenMs: number
}

export type ObservationLedger = ReturnType<typeof createObservationLedger>

export function createObservationLedger(input?: { now?: () => number; ttlMs?: number }) {
  const now = input?.now ?? (() => Date.now())
  const ttlMs = input?.ttlMs ?? OBSERVATION_TTL_MS
  const rows = new Map<string, LedgerRow>()

  function put(observation: Observation) {
    rows.set(observation.id, { observation, spent: false, frozenAt: null, frozenMs: 0 })
  }

  /** 待批开始：停该观察的 TTL。已消费的不能靠冻结复活。 */
  function freeze(id: string, at = now()): boolean {
    const row = rows.get(id.trim())
    if (!row || row.spent) return false
    if (row.frozenAt == null) row.frozenAt = at
    return true
  }

  /** Allow 后恢复计时；未冻结则空操作。 */
  function unfreeze(id: string, at = now()): void {
    const row = rows.get(id.trim())
    if (!row || row.frozenAt == null) return
    row.frozenMs += Math.max(0, at - row.frozenAt)
    row.frozenAt = null
  }

  /** Deny：解冻并作废，禁止再 act。 */
  function discard(id: string): void {
    const row = rows.get(id.trim())
    if (!row) return
    row.spent = true
    row.frozenAt = null
  }

  /** createdAt 起扣除冻结时长；缺失返回 null。 */
  function ageMs(id: string, at = now()): number | null {
    const row = rows.get(id.trim())
    if (!row) return null
    return rowAgeMs(row, at)
  }

  /** 审批卡预览用，不消费。冻结中只要未过期仍可见。 */
  function peek(id: string, at = now()): Observation | null {
    const row = rows.get(id.trim())
    if (!row || row.spent || rowAgeMs(row, at) > ttlMs) return null
    return row.observation
  }

  /** 不管 spent / TTL，给重拍匹配用；不复活。 */
  function lookup(id: string): Observation | null {
    return rows.get(id.trim())?.observation ?? null
  }

  function take(id: string, at = now()): TakeObservation {
    const row = rows.get(id.trim())
    if (!row) return { ok: false, code: "stale_observation", cause: "missing" }
    if (row.spent) return { ok: false, code: "stale_observation", cause: "spent" }
    if (rowAgeMs(row, at) > ttlMs) {
      row.spent = true
      row.frozenAt = null
      return { ok: false, code: "stale_observation", cause: "expired" }
    }
    row.spent = true
    row.frozenAt = null
    return { ok: true, observation: row.observation }
  }

  return { put, freeze, unfreeze, discard, ageMs, peek, lookup, take }
}

function rowAgeMs(row: LedgerRow, at: number): number {
  const liveFreeze = row.frozenAt != null ? Math.max(0, at - row.frozenAt) : 0
  return at - row.observation.createdAt - row.frozenMs - liveFreeze
}
