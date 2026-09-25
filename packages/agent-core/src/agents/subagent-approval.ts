/**
 * 子 Agent 与主循环共用 resolveToolApproval；没有等待器时拒绝写盘，不偷偷执行。
 */
import type { AgentMode } from "@enjoy-agents/ipc-contract"
import { desktopActAppKey } from "../computer-use/desktop-act-app-key.ts"
import { isPersistentDesktopAppKey } from "../computer-use/desktop-always-allow.ts"
import { bashAllowPrefix, commandFromToolInput } from "../policies/bash-prefix.ts"
import {
  BASH_TOOLS,
  resolveToolApproval,
  type ApprovalPolicy,
  type ToolApprovalDecision
} from "../tool-approval.ts"

const BASH_SET = new Set<string>(BASH_TOOLS)

export type SubagentUserDecision = "allow" | "deny" | "allow_session" | "allow_always"

export type WaitForSubagentApproval = (input: {
  toolName: string
  toolCallId: string
  input: unknown
}) => Promise<SubagentUserDecision>

export function createSubagentApproval(options: {
  mode: AgentMode
  policy: ApprovalPolicy
  waitForApproval?: WaitForSubagentApproval
}) {
  const sessionApproved = new Set(options.policy.sessionApprovedTools ?? [])
  const bashPrefixes = [...(options.policy.sessionApprovedBashPrefixes ?? [])]
  const alwaysKeys = [...(options.policy.desktopAlwaysAllowAppKeys ?? [])]
  return async function decide(toolCall: {
    toolName: string
    toolCallId?: string
    input?: unknown
  }): Promise<ToolApprovalDecision> {
    const policy: ApprovalPolicy = {
      ...options.policy,
      sessionApprovedTools: sessionApproved,
      sessionApprovedBashPrefixes: bashPrefixes,
      desktopAlwaysAllowAppKeys: alwaysKeys
    }
    const decision = resolveToolApproval(toolCall.toolName, options.mode, policy, toolCall.input)
    if (!needsUser(decision)) return decision
    if (!options.waitForApproval) {
      return { type: "denied", reason: "subagent write needs the same parent approval." }
    }
    const user = await options.waitForApproval({
      toolName: toolCall.toolName,
      toolCallId: toolCall.toolCallId ?? toolCall.toolName,
      input: toolCall.input
    })
    if (user === "deny") return { type: "denied", reason: "user denied subagent tool." }
    if (user === "allow_session") rememberSessionAllow(toolCall, sessionApproved, bashPrefixes)
    if (user === "allow_always") rememberAlwaysAllow(toolCall, alwaysKeys)
    return "approved"
  }
}

function rememberSessionAllow(
  toolCall: { toolName: string; input?: unknown },
  sessionApproved: Set<string>,
  bashPrefixes: string[]
): void {
  if (BASH_SET.has(toolCall.toolName)) {
    const prefix = bashAllowPrefix(commandFromToolInput(toolCall.input))
    if (prefix) bashPrefixes.push(prefix)
    return
  }
  sessionApproved.add(toolCall.toolName)
}

/** allow_always 只记裸 appKey，不写会话白名单。 */
function rememberAlwaysAllow(toolCall: { input?: unknown }, alwaysKeys: string[]): void {
  const key = desktopActAppKey(toolCall.input)
  if (!isPersistentDesktopAppKey(key) || alwaysKeys.includes(key)) return
  alwaysKeys.push(key)
}

function needsUser(decision: ToolApprovalDecision): boolean {
  return decision === "user-approval" || (typeof decision === "object" && decision?.type === "user-approval")
}
