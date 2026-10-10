/**
 * 本会话允许（非 desktop_act）：进程内表，按 Enjoy sessionId + runtimeId。
 * 不落盘；归档 / 删除 / 截断 / 进程退出才清。重启后空。
 * 只有 user 开跑才种子写盘 / bash；心跳 / 自动化 / 补跑只吃 desktop 表。
 */
import {
  bashAllowPrefix,
  commandFromToolInput,
  writeThroughDesktopActSessionAllow
} from "@enjoy-agents/agent-core"
import {
  desktopActNeedsSecondConfirm,
  desktopGrantShouldPersist,
  snapshotConversationDesktopAllow,
  stripAnyDesktopSessionAllow,
  type LookupDesktopObservation
} from "@enjoy-agents/agent-core/computer-use"
import { isUserInitiatedRunOrigin } from "@enjoy-agents/ipc-contract/agent-run-origin"
import type { SessionAllowItem, SessionAllowScope } from "@enjoy-agents/ipc-contract/session-allow"
import { ASK_USER_QUESTIONS_TOOL } from "@enjoy-agents/ipc-contract/tool-names"
import { mcpFingerprintForTool } from "./mcp-session-fingerprint.ts"

export type ConversationSessionAllow = {
  toolNames: Set<string>
  bashPrefixes: Set<string>
  mcpFingerprints: Map<string, string>
}

export type SeedRunSessionAllowOpts = {
  denyAnyDesktop?: boolean
  origin?: string
  runtimeId?: string
  mcpFingerprintNow?: (toolName: string) => string | undefined
}

const DEFAULT_RUNTIME = "enjoy-local"
export const SESSION_ALLOW_MAX_PREFIXES = 64
export const SESSION_ALLOW_MAX_TOOLS = 64
export const SESSION_ALLOW_MAX_SESSIONS = 500
const MAX_PREFIXES = SESSION_ALLOW_MAX_PREFIXES
const MAX_TOOLS = SESSION_ALLOW_MAX_TOOLS
const MAX_SESSIONS = SESSION_ALLOW_MAX_SESSIONS

type Bucket = {
  toolNames: Map<string, true>
  bashPrefixes: Map<string, true>
  mcpFingerprints: Map<string, string>
  lastUsed: number
}

const conversationSessionAllow = new Map<string, Bucket>()

export function sessionAllowKey(sessionId: string, runtimeId?: string): string {
  const sid = sessionId.trim()
  const runtime = (runtimeId ?? DEFAULT_RUNTIME).trim() || DEFAULT_RUNTIME
  return `${sid}::${runtime}`
}

function evictOldestSession(): void {
  let oldestKey: string | undefined
  let oldest = Infinity
  for (const [key, bucket] of conversationSessionAllow) {
    if (bucket.lastUsed < oldest) {
      oldest = bucket.lastUsed
      oldestKey = key
    }
  }
  if (oldestKey) conversationSessionAllow.delete(oldestKey)
}

function lruSet<T>(map: Map<string, T>, key: string, value: T, max: number): void {
  if (map.has(key)) map.delete(key)
  map.set(key, value)
  while (map.size > max) {
    const first = map.keys().next().value
    if (first === undefined) break
    map.delete(first)
  }
}

function bucket(sessionId: string, runtimeId?: string): Bucket {
  const key = sessionAllowKey(sessionId, runtimeId)
  const current = conversationSessionAllow.get(key)
  if (current) {
    current.lastUsed = Date.now()
    return current
  }
  while (conversationSessionAllow.size >= MAX_SESSIONS) evictOldestSession()
  const next: Bucket = {
    toolNames: new Map(),
    bashPrefixes: new Map(),
    mcpFingerprints: new Map(),
    lastUsed: Date.now()
  }
  conversationSessionAllow.set(key, next)
  return next
}

function snapshotBucket(current: Bucket | undefined): ConversationSessionAllow {
  return {
    toolNames: current ? new Set(current.toolNames.keys()) : new Set(),
    bashPrefixes: current ? new Set(current.bashPrefixes.keys()) : new Set(),
    mcpFingerprints: current ? new Map(current.mcpFingerprints) : new Map()
  }
}

/** 复制一份给 ActiveRun。调用方可变副本，不得拿回内部 Map。 */
export function snapshotConversationSessionAllow(
  sessionId: string,
  runtimeId?: string
): ConversationSessionAllow {
  return snapshotBucket(conversationSessionAllow.get(sessionAllowKey(sessionId, runtimeId)))
}

export function grantConversationToolAllow(sessionId: string, toolName: string, runtimeId?: string): void {
  const sid = sessionId.trim()
  const name = toolName.trim()
  if (!sid || !name || name === ASK_USER_QUESTIONS_TOOL || name === "desktop_act") return
  const slot = bucket(sid, runtimeId)
  lruSet(slot.toolNames, name, true, MAX_TOOLS)
}

export function grantConversationBashPrefix(sessionId: string, prefix: string, runtimeId?: string): void {
  const sid = sessionId.trim()
  const value = prefix.trim()
  if (!sid || !value) return
  lruSet(bucket(sid, runtimeId).bashPrefixes, value, true, MAX_PREFIXES)
}

export function grantConversationMcpAllow(
  sessionId: string,
  toolName: string,
  fingerprint: string,
  runtimeId?: string
): void {
  const sid = sessionId.trim()
  const name = toolName.trim()
  const fp = fingerprint.trim()
  if (!sid || !name || !fp) return
  const slot = bucket(sid, runtimeId)
  lruSet(slot.toolNames, name, true, MAX_TOOLS)
  lruSet(slot.mcpFingerprints, name, fp, MAX_TOOLS)
}

/** 删除 / 归档 / 截断该对话时丢掉所有引擎桶。 */
export function clearConversationSessionAllow(sessionId: string): void {
  const sid = sessionId.trim()
  if (!sid) return
  const prefix = `${sid}::`
  // keys() 迭代时不能删；先拷一份再扫。
  const keys = Array.from(conversationSessionAllow.keys())
  for (const key of keys) {
    if (key === sid || key.startsWith(prefix)) conversationSessionAllow.delete(key)
  }
}

export function clearAllConversationSessionAllows(): void {
  conversationSessionAllow.clear()
}

export function conversationSessionAllowSize(): number {
  return conversationSessionAllow.size
}

function runtimeIdFromKey(key: string, sessionId: string): string {
  const prefix = `${sessionId}::`
  return key.startsWith(prefix) ? key.slice(prefix.length) || DEFAULT_RUNTIME : DEFAULT_RUNTIME
}

function bucketsForSession(sessionId: string, runtimeId?: string): Array<{ runtimeId: string; bucket: Bucket }> {
  if (runtimeId) {
    const current = conversationSessionAllow.get(sessionAllowKey(sessionId, runtimeId))
    return current ? [{ runtimeId: (runtimeId.trim() || DEFAULT_RUNTIME), bucket: current }] : []
  }
  const prefix = `${sessionId}::`
  const rows: Array<{ runtimeId: string; bucket: Bucket }> = []
  for (const [key, bucket] of conversationSessionAllow) {
    if (key === sessionId || key.startsWith(prefix)) {
      rows.push({ runtimeId: runtimeIdFromKey(key, sessionId), bucket })
    }
  }
  return rows
}

/** 列出该会话全部引擎桶的允许项。MCP 用全名。 */
export function listConversationSessionAllows(sessionId: string): SessionAllowItem[] {
  const sid = sessionId.trim()
  if (!sid) return []
  const items: SessionAllowItem[] = []
  for (const { runtimeId, bucket } of bucketsForSession(sid)) {
    for (const toolName of bucket.toolNames.keys()) {
      items.push({ runtimeId, scope: { kind: "tool", toolName } })
    }
    for (const prefix of bucket.bashPrefixes.keys()) {
      items.push({ runtimeId, scope: { kind: "bash_prefix", prefix } })
    }
  }
  return items
}

/**
 * 只改会话表，不碰 ActiveRun 副本。本轮已种子的放行仍有效，下一轮才停。
 * 不传 runtimeId 则该会话所有引擎桶都撤这一条。
 */
export function revokeConversationSessionAllow(
  sessionId: string,
  scope: SessionAllowScope,
  runtimeId?: string
): SessionAllowItem[] {
  const sid = sessionId.trim()
  if (!sid) return []
  for (const { bucket } of bucketsForSession(sid, runtimeId)) {
    if (scope.kind === "tool") {
      bucket.toolNames.delete(scope.toolName)
      bucket.mcpFingerprints.delete(scope.toolName)
    } else {
      bucket.bashPrefixes.delete(scope.prefix)
    }
  }
  return listConversationSessionAllows(sid)
}

function liveToolNames(
  session: ConversationSessionAllow,
  fingerprintNow?: (toolName: string) => string | undefined
): Set<string> {
  const lookup = fingerprintNow ?? safeMcpFingerprint
  const tools = new Set<string>()
  for (const name of session.toolNames) {
    const stored = session.mcpFingerprints.get(name)
    if (stored && lookup(name) !== stored) continue
    tools.add(name)
  }
  return tools
}

function safeMcpFingerprint(toolName: string): string | undefined {
  try {
    return mcpFingerprintForTool(toolName)
  } catch {
    return undefined
  }
}

/**
 * 新 run 种子。user 才并本会话写盘 / bash；其余只并 desktop 表。
 * denyAnyDesktop 只摘 desktop_act:*。
 */
export function seedRunSessionAllow(
  sessionId: string,
  opts?: SeedRunSessionAllowOpts
): { sessionApprovedTools: Set<string>; sessionApprovedBashPrefixes: Set<string> } {
  const desktop = snapshotConversationDesktopAllow(sessionId)
  const userTurn = isUserInitiatedRunOrigin(opts?.origin)
  const session = userTurn ? snapshotConversationSessionAllow(sessionId, opts?.runtimeId) : snapshotBucket(undefined)
  const tools = new Set([...desktop, ...(userTurn ? liveToolNames(session, opts?.mcpFingerprintNow) : [])])
  return {
    sessionApprovedTools: opts?.denyAnyDesktop ? stripAnyDesktopSessionAllow(tools) : tools,
    sessionApprovedBashPrefixes: userTurn ? session.bashPrefixes : new Set()
  }
}

/**
 * allow_session write-through：按 runtime 分桶。
 * desktop_act 仍走 desktop 表；敏感 / 二次确认 / 未解析观察不写任何表。
 */
export function applySessionAllowDecision(
  sessionId: string,
  run: {
    sessionApprovedTools: Set<string>
    sessionApprovedBashPrefixes: Set<string>
  },
  pending: { name: string; args?: unknown },
  lookupDesktopObservation?: LookupDesktopObservation,
  runtimeId?: string
): void {
  if (pending.name === ASK_USER_QUESTIONS_TOOL) return
  if (pending.name === "bash" || pending.name === "code_mode") {
    rememberBashPrefix(sessionId, run, pending.args, runtimeId)
    return
  }
  if (pending.name === "desktop_act") {
    rememberDesktopActSession(sessionId, run, pending.args, lookupDesktopObservation)
    return
  }
  if (pending.name.startsWith("mcp_")) {
    rememberMcpAllow(sessionId, run, pending.name, runtimeId)
    return
  }
  grantConversationToolAllow(sessionId, pending.name, runtimeId)
  run.sessionApprovedTools.add(pending.name)
}

function rememberBashPrefix(
  sessionId: string,
  run: { sessionApprovedBashPrefixes: Set<string> },
  args: unknown,
  runtimeId?: string
): void {
  const prefix = bashAllowPrefix(commandFromToolInput(args))
  if (!prefix) return
  grantConversationBashPrefix(sessionId, prefix, runtimeId)
  run.sessionApprovedBashPrefixes.add(prefix)
}

function rememberMcpAllow(
  sessionId: string,
  run: { sessionApprovedTools: Set<string> },
  toolName: string,
  runtimeId?: string
): void {
  const fingerprint = safeMcpFingerprint(toolName)
  if (fingerprint) grantConversationMcpAllow(sessionId, toolName, fingerprint, runtimeId)
  else grantConversationToolAllow(sessionId, toolName, runtimeId)
  run.sessionApprovedTools.add(toolName)
}

function rememberDesktopActSession(
  sessionId: string,
  run: { sessionApprovedTools: Set<string> },
  args: unknown,
  lookup?: LookupDesktopObservation
): void {
  if (desktopActNeedsSecondConfirm(args)) return
  if (!desktopGrantShouldPersist(args, lookup)) return
  writeThroughDesktopActSessionAllow(sessionId, run.sessionApprovedTools, args)
}
