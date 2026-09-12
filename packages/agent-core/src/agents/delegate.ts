/**
 * delegate：主 Agent 派子任务。独立上下文，只回摘要；写盘走同一审批，不另开后门。
 * 并发闸门挂本函数闭包（每 Agent 一份），禁止模块单例跨 run 漏槽。
 * 不是 Workflow DAG，也不是侧栏会话。
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
import { traceSubagentTools, type SubagentToolTraceEvent } from "./subagent-tool-trace.ts"
import { joinInstructions } from "../join-instructions.ts"
import { createDelegateGate, MAX_PARALLEL_DELEGATES } from "./delegate-concurrency.ts"

export function createDelegateTool(
  run: (
    task: string,
    parentToolCallId?: string,
    kind?: "general" | "explore"
  ) => Promise<SubagentSummary>
) {
  const gate = createDelegateGate(MAX_PARALLEL_DELEGATES)
  return {
    delegate: tool({
      description:
        "Delegate a specialist task. The subagent returns a summary. Its tool calls appear under this step. Writes use the same approval as the parent.",
      inputSchema: z.object({
        task: z.string().describe("What the specialist should investigate"),
        title: z.string().optional(),
        kind: z
          .enum(["general", "explore"])
          .optional()
          .describe("explore = read-only codebase search; general = same tools as the parent")
      }),
      execute: async (
        { task, title, kind }: { task: string; title?: string; kind?: "general" | "explore" },
        options?: { toolCallId?: string; abortSignal?: AbortSignal }
      ) => {
        return gate(async () => {
          const summary = await run(task, options?.toolCallId, kind ?? "general")
          return { ...summary, title: title?.trim() || summary.title }
        }, options?.abortSignal)
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
  parentToolCallId?: string
  onToolEvent?: (event: SubagentToolTraceEvent) => void
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
  parentToolCallId?: string
  onToolEvent?: (event: SubagentToolTraceEvent) => void
}): Promise<string> {
  const rawTools = createReadTools(options.host)
  const tools =
    options.onToolEvent && options.parentToolCallId
      ? traceSubagentTools(rawTools, {
          parentToolCallId: options.parentToolCallId,
          emit: options.onToolEvent
        })
      : rawTools
  const { text } = await generateText({
    model: options.model,
    abortSignal: options.abortSignal,
    system: joinInstructions(
      "You are a read-only specialist subagent. Use read tools only. Never write files or run shell. Return a concise report.",
      options.extraInstructions
    ),
    prompt: options.task,
    tools
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
  parentToolCallId?: string
  onToolEvent?: (event: SubagentToolTraceEvent) => void
  kind?: "general" | "explore"
  exploreModel?: LanguageModel
}): Promise<SubagentSummary> {
  if (options.kind === "explore" || options.mode === "ask" || options.mode === "plan") {
    return runReadOnlySubagent({
      ...options,
      model: options.kind === "explore" && options.exploreModel ? options.exploreModel : options.model
    })
  }
  return runApprovedSubagent(options)
}
