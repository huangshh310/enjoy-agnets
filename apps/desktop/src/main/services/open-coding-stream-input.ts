/**
 * 开流入参与审批策略。从 open-coding-stream 抽出，避免调度函数超 50 行。
 */
import type { ModelMessage } from "ai"
import type { ApprovalPolicy, SubagentToolTraceEvent, WaitForSubagentApproval } from "@enjoy-agents/agent-core"
import { DESKTOP_ACT_ANY_SESSION_KEY, mergeConversationDesktopAllow } from "@enjoy-agents/agent-core/computer-use"
import {
  type AgentMode,
  type AskUserAnswers,
  type HostInjectSnapshot,
  type ReasoningEffort
} from "@enjoy-agents/ipc-contract"
import { listDesktopAlwaysAllowAppKeys } from "./builtin-tools/computer-use/desktop-always-allow-entries"
import type { AppPreferences } from "./preferences"
import type { StoredSecret } from "./secrets"

export type OpenedCodingStream = {
  stream: AsyncIterable<Record<string, unknown>>
  result: unknown
  dispose: () => Promise<void>
  /** 本轮 Enjoy SoT 注入结果；失败或能力 none 时 injected 为空。 */
  hostInject?: HostInjectSnapshot
}

export type OpenCodingStreamInput = {
  runId: string
  mode: AgentMode
  messages: ModelMessage[]
  abortSignal: AbortSignal
  workspaceRoot: string
  workspaceId?: string
  sessionId: string
  modelId: string
  secret?: StoredSecret
  prefs: AppPreferences
  effort?: ReasoningEffort
  thoughtLevel?: string
  fast?: boolean
  sessionApprovedTools: ReadonlySet<string>
  sessionApprovedBashPrefixes?: readonly string[]
  executePlan?: boolean
  waitForSubagentApproval?: WaitForSubagentApproval
  onSubagentToolEvent?: (event: SubagentToolTraceEvent) => void
  runtimeId?: string
  pullSteeringMessages?: () => ModelMessage[]
  takeQuestionAnswers?: () => AskUserAnswers | undefined
}

/**
 * 审批只读会话表 ∪ 本轮 run 副本，再投影持久簿 appKey[]。
 * 禁止从 builtin_tools 偏好读 anyDesktop。写 SoT 仍是 `{ appKey, displayName }[]`。
 */
export function approvalPolicyFromPrefs(input: OpenCodingStreamInput): ApprovalPolicy {
  const sessionApprovedTools = mergeConversationDesktopAllow(input.sessionId, input.sessionApprovedTools)
  return {
    requireWriteApproval: input.prefs.requireWriteApproval,
    requireBashApproval: input.prefs.requireBashApproval,
    requireCommitApproval: input.prefs.requireCommitApproval,
    sessionApprovedTools,
    sessionApprovedBashPrefixes: input.sessionApprovedBashPrefixes,
    anyDesktopSession: sessionApprovedTools.has(DESKTOP_ACT_ANY_SESSION_KEY),
    desktopAlwaysAllowAppKeys: listDesktopAlwaysAllowAppKeys(input.prefs.desktopAlwaysAllowAppKeys)
  }
}
