// @ts-nocheck — Zod 4 object schemas are runtime-valid with AI SDK 7; the
// published FlexibleSchema types still track Zod 3's ZodType shape.
/**
 * 按模式组装 ToolLoop 工具。plan/ask 不注册写盘与 shell。
 */
import { tool } from "ai"
import { z } from "zod"
import type { AgentMode } from "@enjoy-agents/ipc-contract"
import type { AgentWorkspaceHost } from "../runtime-context.ts"
import { createAskUserQuestionsTool } from "./ask-user-questions.ts"
import { isReadOnlyAgentMode } from "./coding-tool-names.ts"
import { createReadTools } from "./read-tools.ts"
import { createTodoWriteTool } from "./todo-write.ts"
import { createWriteTools } from "./write-tools.ts"

const MAX_TOOL_CHARS = 80_000

function truncate(value: string): string {
  if (value.length <= MAX_TOOL_CHARS) return value
  return `${value.slice(0, MAX_TOOL_CHARS)}\n...[truncated]`
}

export type CodingToolsOptions = {
  includeAskUser?: boolean
  mode?: AgentMode
}

/**
 * AI SDK 7 的 execute() 只注入 toolsContext[name]，不会把 runtimeContext 放进 options.context。
 * 因此 host 必须在建工具时闭包注入，否则 Allow 后续跑会报 Workspace host is missing。
 */
export function createCodingTools(host: AgentWorkspaceHost, options?: CodingToolsOptions) {
  const readOnly = isReadOnlyAgentMode(options?.mode ?? "agent")
  return {
    ...createReadTools(host),
    ...createTodoWriteTool(),
    ...(options?.includeAskUser === false ? {} : createAskUserQuestionsTool(host)),
    git_status: tool({
      description: "Show git status for the workspace.",
      inputSchema: z.object({}),
      execute: async () => {
        return { status: await host.gitStatus() }
      }
    }),
    git_diff: tool({
      description: "Show git diff for the workspace or a single path.",
      inputSchema: z.object({
        path: z.string().optional()
      }),
      execute: async ({ path }) => {
        return { diff: truncate(await host.gitDiff(path)) }
      }
    }),
    ...(readOnly ? {} : createWriteTools(host))
  }
}
