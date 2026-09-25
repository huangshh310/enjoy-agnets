/**
 * Computer Use 观察账本：一次快照一个编号，用过或过期都不能再点。
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
  elements: ObservationElement[]
  createdAt: number
  platform: string
  thumbnailPath?: string
}

export type TakeObservation =
  | { ok: true; observation: Observation }
  | { ok: false; code: "stale_observation" }

export function createObservationLedger(input?: { now?: () => number; ttlMs?: number }) {
  const now = input?.now ?? (() => Date.now())
  const ttlMs = input?.ttlMs ?? OBSERVATION_TTL_MS
  const rows = new Map<string, { observation: Observation; spent: boolean }>()

  function put(observation: Observation) {
    rows.set(observation.id, { observation, spent: false })
  }

  /** 审批卡预览用，不消费。 */
  function peek(id: string, at = now()): Observation | null {
    const row = rows.get(id.trim())
    if (!row || row.spent || at - row.observation.createdAt > ttlMs) return null
    return row.observation
  }

  function take(id: string, at = now()): TakeObservation {
    const row = rows.get(id.trim())
    if (!row || row.spent || at - row.observation.createdAt > ttlMs) {
      if (row) row.spent = true
      return { ok: false, code: "stale_observation" }
    }
    row.spent = true
    return { ok: true, observation: row.observation }
  }

  return { put, peek, take }
}
