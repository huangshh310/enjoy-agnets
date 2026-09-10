// @ts-nocheck — 与 createCodingTools 相同：Zod 4 + AI SDK Tool 泛型。
/**
 * 只读 Git 工具：status / diff / log。plan/ask 也注册；审批 not-applicable。
 */
import { tool } from "ai"
import { z } from "zod"
import type { AgentWorkspaceHost } from "../runtime-context.ts"
import { clampGitLogLimit, GIT_LOG_DEFAULT_LIMIT, GIT_LOG_MAX_LIMIT } from "./git-log-limit.ts"

const MAX_TOOL_CHARS = 80_000

function truncate(value: string): string {
  if (value.length <= MAX_TOOL_CHARS) return value
  return `${value.slice(0, MAX_TOOL_CHARS)}\n...[truncated]`
}

export function createGitReadTools(host: AgentWorkspaceHost) {
  return {
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
    git_log: tool({
      description:
        "Show a linear git log (not a graph). Optional path and limit; default 20, max 100.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(GIT_LOG_MAX_LIMIT).optional(),
        path: z.string().optional()
      }),
      execute: async ({ limit, path }) => {
        return {
          log: truncate(
            await host.gitLog({
              limit: clampGitLogLimit(limit ?? GIT_LOG_DEFAULT_LIMIT),
              path
            })
          )
        }
      }
    })
  }
}
