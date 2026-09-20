/**
 * 开流入参与审批策略。从 open-coding-stream 抽出，避免调度函数超 50 行。
 */
import type { ModelMessage } from "ai"
import type {
  ApprovalPolicy,
  SubagentToolTraceEvent,
  WaitForSubagentApproval
} from "@enjoy-agents/agent-core"
import {
  type AgentMode,
  type AskUserAnswers,
  type HostInjectSnapshot,
  type ReasoningEffort
} from "@enjoy-agents/ipc-contract"
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

/** 把偏好和本轮已批工具收成 ApprovalPolicy。 */
export function approvalPolicyFromPrefs(input: OpenCodingStreamInput): ApprovalPolicy {
  return {
    requireWriteApproval: input.prefs.requireWriteApproval,
    requireBashApproval: input.prefs.requireBashApproval,
    requireCommitApproval: input.prefs.requireCommitApproval,
    sessionApprovedTools: input.sessionApprovedTools,
    sessionApprovedBashPrefixes: input.sessionApprovedBashPrefixes
  }
}
