/**
 * delegate：主 Agent 派子任务。独立上下文，只回摘要；写盘走同一审批，不另开后门。
 */
import { generateText, tool, type LanguageModel } from "ai"
import { z } from "zod"
import { createReadTools } from "../tools/read-tools.ts"
import type { AgentWorkspaceHost } from "../runtime-context.ts"
import type { AgentMode } from "@enjoy-agents/ipc-contract"
import type { ApprovalPolicy } from "../tool-approval.ts"
import { summarizeSubagent, type SubagentSummary } from "./subagent.ts"
import { runApprovedSubagent } from "./subagent-loop.ts"
import type { WaitForSubagentApproval } from "./subagent-approval.ts"
import { joinInstructions } from "../join-instructions.ts"

export function createDelegateTool(run: (task: string) => Promise<SubagentSummary>) {
  return {
    delegate: tool({
      description:
        "Delegate a specialist task. The subagent returns a summary. Writes use the same approval as the parent.",
      inputSchema: z.object({
        task: z.string().describe("What the specialist should investigate"),
        title: z.string().optional()
      }),
      execute: async ({ task, title }: { task: string; title?: string }) => {
        const summary = await run(task)
        return { ...summary, title: title?.trim() || summary.title }
      }
    })
  }
}

export async function runReadOnlySubagent(options: {
  model: LanguageModel
  task: string
  host: AgentWorkspaceHost
  abortSignal?: AbortSignal
  generate?: (task: string) => Promise<string>
  extraInstructions?: string
}): Promise<SubagentSummary> {
  const text = options.generate
    ? await options.generate(options.task)
    : await generateSubagentText(options)
  return summarizeSubagent({
    title: options.task.slice(0, 80),
    text
  })
}

async function generateSubagentText(options: {
  model: LanguageModel
  task: string
  host: AgentWorkspaceHost
  abortSignal?: AbortSignal
  extraInstructions?: string
}): Promise<string> {
  const { text } = await generateText({
    model: options.model,
    abortSignal: options.abortSignal,
    system: joinInstructions(
      "You are a read-only specialist subagent. Use read tools only. Never write files or run shell. Return a concise report.",
      options.extraInstructions
    ),
    prompt: options.task,
    tools: createReadTools(options.host)
  })
  return text
}

/** plan/ask 只读；agent/debug 可写，但必须经过同一套 toolApproval。 */
export function runDelegatedSubagent(options: {
  model: LanguageModel
  task: string
  host: AgentWorkspaceHost
  mode: AgentMode
  policy: ApprovalPolicy
  abortSignal?: AbortSignal
  generate?: (task: string) => Promise<string>
  waitForApproval?: WaitForSubagentApproval
  extraInstructions?: string
}): Promise<SubagentSummary> {
  if (options.mode === "ask" || options.mode === "plan") {
    return runReadOnlySubagent(options)
  }
  return runApprovedSubagent(options)
}
