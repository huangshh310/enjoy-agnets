/**
 * 每个会话最后一次 usage.updated。没有事件就不造数字。
 * 仅窗口广告会留下 inputTokens: 0，不能当成实测。
 * COST-P3：顺带记住 estimatedCost，给 ledger 用量行。
 */
import type { EstimatedCost } from "@enjoy-agents/ipc-contract/estimated-cost"

export type SessionUsage = {
  inputTokens: number
  outputTokens?: number
  totalTokens?: number
  /** 本轮真正报过词元，不是只报了窗口。 */
  hasReportedTokens: boolean
  /** ACP usage_update.size：报出这次用量的那台引擎的窗口。 */
  contextWindow?: number
  /** 和 contextWindow 一起记下，换引擎后不再拿上一台的 size。 */
  contextRuntimeId?: string
  /** 本轮 usage.updated 带来的估算；没有就不编。 */
  estimatedCost?: EstimatedCost
}

export type SessionUsagePatch = {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  contextWindow?: number
  estimatedCost?: EstimatedCost
}

const bySession = new Map<string, SessionUsage>()
let version = 0
const listeners = new Set<() => void>()

/** 新一轮 run.start 清掉上一轮，避免旧数字被标成本轮实测。 */
export function clearSessionUsage(sessionId: string): void {
  if (!bySession.delete(sessionId)) return
  bump()
}

export function rememberSessionUsage(
  sessionId: string,
  usage: SessionUsagePatch,
  runtimeId?: string
): void {
  const tokens = pickReportedTokens(usage)
  const windowOk = typeof usage.contextWindow === "number" && usage.contextWindow > 0
  const costOk = Boolean(usage.estimatedCost?.status)
  if (!tokens && !windowOk && !costOk) return
  const prev = bySession.get(sessionId)
  const sameEngine = !runtimeId || !prev?.contextRuntimeId || prev.contextRuntimeId === runtimeId
  const next: SessionUsage = {
    ...mergeTokenFields(prev, tokens),
    ...keptWindow(windowOk ? usage.contextWindow : undefined, sameEngine ? prev : undefined, runtimeId)
  }
  if (costOk) next.estimatedCost = usage.estimatedCost
  else if (prev?.estimatedCost) next.estimatedCost = prev.estimatedCost
  bySession.set(sessionId, next)
  bump()
}

/** 有实测才给数字；只报窗口或没有事件都是 null。 */
export function reportedTurnTokens(usage: SessionUsage | null): number | null {
  if (!usage?.hasReportedTokens) return null
  if (typeof usage.totalTokens === "number" && usage.totalTokens >= 0) return usage.totalTokens
  return usage.inputTokens + (usage.outputTokens ?? 0)
}

function pickReportedTokens(usage: SessionUsagePatch): SessionUsagePatch | null {
  const inputOk = typeof usage.inputTokens === "number" && usage.inputTokens >= 0
  const outputOk = typeof usage.outputTokens === "number" && usage.outputTokens >= 0
  const totalOk = typeof usage.totalTokens === "number" && usage.totalTokens >= 0
  if (!inputOk && !outputOk && !totalOk) return null
  return {
    ...(inputOk ? { inputTokens: usage.inputTokens } : {}),
    ...(outputOk ? { outputTokens: usage.outputTokens } : {}),
    ...(totalOk ? { totalTokens: usage.totalTokens } : {})
  }
}

function mergeTokenFields(prev: SessionUsage | undefined, next: SessionUsagePatch | null): SessionUsage {
  if (!next) {
    return {
      inputTokens: prev?.inputTokens ?? 0,
      ...(prev?.outputTokens != null ? { outputTokens: prev.outputTokens } : {}),
      ...(prev?.totalTokens != null ? { totalTokens: prev.totalTokens } : {}),
      hasReportedTokens: Boolean(prev?.hasReportedTokens)
    }
  }
  return {
    inputTokens: next.inputTokens ?? prev?.inputTokens ?? 0,
    ...(typeof next.outputTokens === "number" ? { outputTokens: next.outputTokens } : {}),
    ...(typeof next.totalTokens === "number" ? { totalTokens: next.totalTokens } : {}),
    hasReportedTokens: true
  }
}

function keptWindow(
  next: number | undefined,
  prev: SessionUsage | undefined,
  runtimeId?: string
): Pick<SessionUsage, "contextWindow" | "contextRuntimeId"> {
  if (next && next > 0) return { contextWindow: next, ...(runtimeId ? { contextRuntimeId: runtimeId } : {}) }
  if (prev?.contextWindow) {
    return {
      contextWindow: prev.contextWindow,
      ...(prev.contextRuntimeId ? { contextRuntimeId: prev.contextRuntimeId } : {})
    }
  }
  return {}
}

function bump(): void {
  version += 1
  for (const listener of listeners) listener()
}

export function subscribeSessionUsage(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function sessionUsageVersion(): number {
  return version
}

export function sessionUsageFor(sessionId: string | null): SessionUsage | null {
  if (!sessionId) return null
  return bySession.get(sessionId) ?? null
}
