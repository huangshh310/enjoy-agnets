// @ts-nocheck — Zod 4 object schemas are runtime-valid with AI SDK 7; the
// published FlexibleSchema types still track Zod 3's ZodType shape.
/**
 * 按模式组装 ToolLoop 工具。plan/ask 不注册写盘与 shell。
 */
import type { AgentMode } from "@enjoy-agents/ipc-contract"
import type { AgentWorkspaceHost } from "../runtime-context.ts"
import { createAskUserQuestionsTool } from "./ask-user-questions.ts"
import { isReadOnlyAgentMode } from "./coding-tool-names.ts"
import { createGitReadTools } from "./git-read-tools.ts"
import { createReadTools } from "./read-tools.ts"
import { createSkillTool, type SkillHost } from "./skill-tool.ts"
import { createSubmitPlanTool } from "./submit-plan.ts"
import { createTodoWriteTool } from "./todo-write.ts"
import { createWriteTools } from "./write-tools.ts"

export type CodingToolsOptions = {
  includeAskUser?: boolean
  mode?: AgentMode
  skills?: SkillHost
}

/**
 * AI SDK 7 的 execute() 只注入 toolsContext[name]，不会把 runtimeContext 放进 options.context。
 * 因此 host 必须在建工具时闭包注入，否则 Allow 后续跑会报 Workspace host is missing。
 */
export function createCodingTools(host: AgentWorkspaceHost, options?: CodingToolsOptions) {
  const readOnly = isReadOnlyAgentMode(options?.mode ?? "agent")
  return {
    ...createReadTools(host),
    ...createSkillTool(options?.skills),
    ...createTodoWriteTool(),
    ...(options?.includeAskUser === false ? {} : createAskUserQuestionsTool(host)),
    ...createGitReadTools(host),
    ...(options?.mode === "plan" ? createSubmitPlanTool(host) : {}),
    ...(readOnly ? {} : createWriteTools(host))
  }
}
