import { ToolLoopAgent, type LanguageModel, type ModelMessage } from "ai"
import type { AgentMode } from "@enjoy-agents/ipc-contract"
import { systemPromptFor } from "./prompts"
import { codingTools } from "./tools"
import type { AgentRuntimeContext } from "./runtime-context"

const MUTATING_TOOLS = ["edit_file", "write_file", "bash", "git_commit"] as const

export function createCodingAgent(
  model: LanguageModel,
  mode: AgentMode = "agent",
  options: { sessionApprovedTools?: ReadonlySet<string> } = {}
) {
  const readOnly = mode === "ask" || mode === "plan"

  return new ToolLoopAgent({
    model,
    instructions: systemPromptFor(mode),
    tools: codingTools,
    toolApproval: ({ toolCall }) => {
      if (options.sessionApprovedTools?.has(toolCall.toolName)) {
        return "approved"
      }
      if (!MUTATING_TOOLS.includes(toolCall.toolName as (typeof MUTATING_TOOLS)[number])) {
        return undefined
      }
      if (readOnly) {
        return { type: "denied", reason: `${mode} mode is read-only.` }
      }
      return "user-approval"
    }
  })
}

export async function streamCodingAgent(options: {
  model: LanguageModel
  mode: AgentMode
  messages: ModelMessage[]
  runtimeContext: AgentRuntimeContext
  abortSignal?: AbortSignal
  sessionApprovedTools?: ReadonlySet<string>
}) {
  const agent = createCodingAgent(options.model, options.mode, {
    sessionApprovedTools: options.sessionApprovedTools
  })
  return agent.stream({
    messages: options.messages,
    abortSignal: options.abortSignal,
    experimental_context: options.runtimeContext
  } as { messages: ModelMessage[]; abortSignal?: AbortSignal })
}
