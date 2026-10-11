/**
 * 这次执行命中的会话允许范围，给 mike 可撤销芯片。
 */
import { BASH_TOOLS, WRITE_TOOLS } from "@enjoy-agents/ipc-contract/tool-names"
import type { SessionAllowScope } from "@enjoy-agents/ipc-contract/session-allow"
import { commandFromToolInput, sessionAllowsBash } from "./bash-prefix.ts"
import { sessionTableAllowsTool, type ApprovalPolicy } from "../tool-approval.ts"

const BASH_SET = new Set<string>(BASH_TOOLS)

export function sessionAllowScopeFor(
  toolName: string,
  policy: ApprovalPolicy,
  input?: unknown
): SessionAllowScope | undefined {
  if (!sessionTableAllowsTool(toolName, policy, input)) return undefined
  if (BASH_SET.has(toolName)) {
    const command = commandFromToolInput(input)
    const matched = policy.sessionApprovedBashCommands?.find((allowed) =>
      sessionAllowsBash(command, [allowed])
    )
    return matched ? { kind: "bash_command", command: matched } : undefined
  }
  const tools = policy.sessionApprovedTools
  if (!tools) return undefined
  if (tools.has(toolName)) return { kind: "tool", toolName }
  const granted = WRITE_TOOLS.find((name) => tools.has(name))
  return granted ? { kind: "tool", toolName: granted } : undefined
}
