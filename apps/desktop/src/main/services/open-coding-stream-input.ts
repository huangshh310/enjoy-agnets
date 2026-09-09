/**
 * 开流入参与审批策略。从 open-coding-stream 抽出，避免调度函数超 50 行。
 */
import type { ModelMessage } from "ai"
import type { ApprovalPolicy, WaitForSubagentApproval } from "@enjoy-agents/agent-core"
import { type AgentMode, type AskUserAnswers, type ReasoningEffort } from "@enjoy-agents/ipc-contract"
import type { AppPreferences } from "./preferences"
import type { StoredSecret } from "./secrets"

export type OpenedCodingStream = {
  stream: AsyncIterable<Record<string, unknown>>
  result: unknown
  dispose: () => Promise<void>
}

export type OpenCodingStreamInput = {
  runId: string
  mode: AgentMode
  messages: ModelMessage[]
  abortSignal: AbortSignal
  workspaceRoot: string
  sessionId: string
  modelId: string
  secret?: StoredSecret
  prefs: AppPreferences
  effort?: ReasoningEffort
  fast?: boolean
  sessionApprovedTools: ReadonlySet<string>
  waitForSubagentApproval?: WaitForSubagentApproval
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
    sessionApprovedTools: input.sessionApprovedTools
  }
}
