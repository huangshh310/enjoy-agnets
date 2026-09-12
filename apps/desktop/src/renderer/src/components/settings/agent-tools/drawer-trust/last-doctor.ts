/**
 * 本会话上次体检：关抽屉再开仍能显示相对时间，不写盘、不假装历史绿灯。
 */
import type { AgentToolDoctorResult } from "@enjoy-agents/ipc-contract"
import type { TrustDoctorSnapshot } from "./drawer-trust.types"

const cache = new Map<string, TrustDoctorSnapshot>()

export function readLastDoctor(id: string): TrustDoctorSnapshot | null {
  return cache.get(id) ?? null
}

export function writeLastDoctor(id: string, result: AgentToolDoctorResult, ranAt: number): void {
  cache.set(id, { result, ranAt })
}

/** 单测用；不传 id 则清空整表。 */
export function clearLastDoctor(id?: string): void {
  if (id) cache.delete(id)
  else cache.clear()
}
