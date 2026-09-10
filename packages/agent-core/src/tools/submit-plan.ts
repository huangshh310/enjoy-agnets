// @ts-nocheck — Zod 4 object schemas are runtime-valid with AI SDK 7.
/**
 * Plan 模式提交计划：写入 implementation_plan.md，等人点「按此执行」。
 * 固定路径，不走 write_file 审批；模型在 plan 模式仍然没有写工具。
 */
import { tool } from "ai"
import { z } from "zod"
import type { AgentWorkspaceHost } from "../runtime-context.ts"
import { persistImplementationPlan } from "./implementation-plan.ts"

export const SUBMIT_PLAN_TOOL = "submit_plan"

export function createSubmitPlanTool(host: AgentWorkspaceHost) {
  return {
    [SUBMIT_PLAN_TOOL]: tool({
      description:
        "Submit a concrete implementation plan. Writes implementation_plan.md at the workspace root. Do not edit other files in plan mode.",
      inputSchema: z.object({
        plan: z.string().min(1),
        files: z.array(z.string()).optional()
      }),
      execute: async ({ plan, files }) => {
        const persisted = await persistImplementationPlan(host.writeFile, plan, files)
        return {
          submitted: true,
          plan,
          files: files ?? [],
          path: persisted.path,
          writeError: persisted.writeError
        }
      }
    })
  }
}
