/**
 * 本会话允许（非 desktop_act）：进程内 Map，按 Enjoy sessionId。
 * 不落盘；归档 / 删除 / 进程退出才清。与 desktop 会话表同寿命，重启后空。
 */
import { bashAllowPrefix, commandFromToolInput, writeThroughDesktopActSessionAllow } from "@enjoy-agents/agent-core"
import {
  desktopActNeedsSecondConfirm,
  desktopGrantShouldPersist,
  snapshotConversationDesktopAllow,
  stripAnyDesktopSessionAllow,
  type LookupDesktopObservation
} from "@enjoy-agents/agent-core/computer-use"
import { ASK_USER_QUESTIONS_TOOL } from "@enjoy-agents/ipc-contract"

export type ConversationSessionAllow = {
  toolNames: Set<string>
  bashPrefixes: Set<string>
}

const conversationSessionAllow = new Map<string, ConversationSessionAllow>()

function bucket(sessionId: string): ConversationSessionAllow {
  const sid = sessionId.trim()
  const current = conversationSessionAllow.get(sid)
  if (current) return current
  const next = { toolNames: new Set<string>(), bashPrefixes: new Set<string>() }
  conversationSessionAllow.set(sid, next)
  return next
}

/** 复制一份给 ActiveRun。调用方可变副本，不得拿回内部 Set。 */
export function snapshotConversationSessionAllow(sessionId: string): ConversationSessionAllow {
  const current = conversationSessionAllow.get(sessionId.trim())
  return {
    toolNames: current ? new Set(current.toolNames) : new Set(),
    bashPrefixes: current ? new Set(current.bashPrefixes) : new Set()
  }
}

export function grantConversationToolAllow(sessionId: string, toolName: string): void {
  const sid = sessionId.trim()
  const name = toolName.trim()
  if (!sid || !name || name === ASK_USER_QUESTIONS_TOOL || name === "desktop_act") return
  bucket(sid).toolNames.add(name)
}

export function grantConversationBashPrefix(sessionId: string, prefix: string): void {
  const sid = sessionId.trim()
  const value = prefix.trim()
  if (!sid || !value) return
  bucket(sid).bashPrefixes.add(value)
}

/** 删除 / 归档该对话时整表丢掉。 */
export function clearConversationSessionAllow(sessionId: string): void {
  conversationSessionAllow.delete(sessionId.trim())
}

/** 进程退出时清全部。内存本就会没，测试与 will-quit 显式收口。 */
export function clearAllConversationSessionAllows(): void {
  conversationSessionAllow.clear()
}

/**
 * 新 run 种子：desktop 表 ∪ 本会话工具名 / bash 前缀。
 * denyAnyDesktop 只摘 desktop_act:*，写盘名留下。
 */
export function seedRunSessionAllow(
  sessionId: string,
  denyAnyDesktop?: boolean
): { sessionApprovedTools: Set<string>; sessionApprovedBashPrefixes: Set<string> } {
  const session = snapshotConversationSessionAllow(sessionId)
  const tools = new Set([...snapshotConversationDesktopAllow(sessionId), ...session.toolNames])
  return {
    sessionApprovedTools: denyAnyDesktop ? stripAnyDesktopSessionAllow(tools) : tools,
    sessionApprovedBashPrefixes: session.bashPrefixes
  }
}

/**
 * allow_session write-through：会话表 + 本轮 run 副本。
 * desktop_act 仍走 desktop 表；敏感 / 二次确认 / 未解析观察不写任何表。
 */
export function applySessionAllowDecision(
  sessionId: string,
  run: {
    sessionApprovedTools: Set<string>
    sessionApprovedBashPrefixes: Set<string>
  },
  pending: { name: string; args?: unknown },
  lookupDesktopObservation?: LookupDesktopObservation
): void {
  if (pending.name === ASK_USER_QUESTIONS_TOOL) return
  if (pending.name === "bash" || pending.name === "code_mode") {
    rememberBashPrefix(sessionId, run, pending.args)
    return
  }
  if (pending.name === "desktop_act") {
    rememberDesktopActSession(sessionId, run, pending.args, lookupDesktopObservation)
    return
  }
  grantConversationToolAllow(sessionId, pending.name)
  run.sessionApprovedTools.add(pending.name)
}

function rememberBashPrefix(
  sessionId: string,
  run: { sessionApprovedBashPrefixes: Set<string> },
  args: unknown
): void {
  const prefix = bashAllowPrefix(commandFromToolInput(args))
  if (!prefix) return
  grantConversationBashPrefix(sessionId, prefix)
  run.sessionApprovedBashPrefixes.add(prefix)
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
