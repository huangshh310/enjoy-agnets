/**
 * 可写子 Agent：同一套 toolApproval，不带 delegate，避免嵌套派工。
 */
import { ToolLoopAgent, type LanguageModel } from "ai"
import type { AgentMode } from "@enjoy-agents/ipc-contract"
import type { ApprovalPolicy } from "../tool-approval.ts"
import type { AgentWorkspaceHost } from "../runtime-context.ts"
import { summarizeSubagent, type SubagentSummary } from "./subagent.ts"
import { createSubagentApproval, type WaitForSubagentApproval } from "./subagent-approval.ts"

export async function runApprovedSubagent(options: {
  model: LanguageModel
  task: string
  host: AgentWorkspaceHost
  mode: AgentMode
  policy: ApprovalPolicy
  abortSignal?: AbortSignal
  generate?: (task: string) => Promise<string>
  waitForApproval?: WaitForSubagentApproval
}): Promise<SubagentSummary> {
  const text = options.generate
    ? await options.generate(options.task)
    : await generateWithSharedApproval(options)
  return summarizeSubagent({
    title: options.task.slice(0, 80),
    text
  })
}

async function generateWithSharedApproval(options: {
  model: LanguageModel
  task: string
  host: AgentWorkspaceHost
  mode: AgentMode
  policy: ApprovalPolicy
  abortSignal?: AbortSignal
  waitForApproval?: WaitForSubagentApproval
}): Promise<string> {
  const decide = createSubagentApproval({
    mode: options.mode,
    policy: options.policy,
    waitForApproval: options.waitForApproval
  })
  const { createCodingTools } = await import("../tools/index.ts")
  const agent = new ToolLoopAgent({
    model: options.model,
    instructions:
      "You are a specialist subagent. Return a concise report. Writes and shell use the same approval policy as the parent agent. Do not claim you bypassed approval.",
    tools: createCodingTools(options.host, { includeAskUser: false }),
    toolApproval: ({ toolCall }) => {
      if (!toolCall) return { type: "denied", reason: "Missing tool call." }
      return decide({
        toolName: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        input: toolCall.input
      })
    }
  })
  const generated = agent as { generate?: (input: { prompt: string; abortSignal?: AbortSignal }) => Promise<{ text?: string }> }
  if (!generated.generate) {
    throw new Error("ToolLoopAgent.generate is unavailable for subagent.")
  }
  const { text } = await generated.generate({
    prompt: options.task,
    abortSignal: options.abortSignal
  })
  return text ?? ""
}
