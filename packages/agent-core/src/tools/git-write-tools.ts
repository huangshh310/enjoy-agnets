// @ts-nocheck — 与 createCodingTools 相同：Zod 4 + AI SDK Tool 泛型。
/**
 * Git 写工具：commit / branch / push。与写盘同一套审批。
 */
import { tool } from "ai"
import { z } from "zod"
import type { AgentWorkspaceHost } from "../runtime-context.ts"
import { CLIP_COMMAND_CHARS, clipToolText } from "./clip-tool-text.ts"

export function createGitWriteTools(host: AgentWorkspaceHost) {
  return {
    git_commit: tool({
      description:
        "Create a git commit. Requires user approval. Default commits only staged files; set stageAll to git add -A.",
      inputSchema: z.object({
        message: z.string(),
        stageAll: z.boolean().optional()
      }),
      execute: async ({ message, stageAll }) => {
        const result = await host.gitCommit(message, { stageAll: stageAll === true })
        return { result: clipToolText(result, CLIP_COMMAND_CHARS) }
      }
    }),
    git_branch: tool({
      description: "Create a git branch. Optional checkout. Requires the same Git approval as commit.",
      inputSchema: z.object({
        name: z.string(),
        checkout: z.boolean().optional()
      }),
      execute: async ({ name, checkout }) => {
        if (!host.gitBranch) throw new Error("git_branch is not available.")
        const result = await host.gitBranch(name, checkout === true)
        return { result: clipToolText(result, CLIP_COMMAND_CHARS) }
      }
    }),
    git_push: tool({
      description:
        "Push the current branch to its upstream. Requires user approval. Fails if there is no upstream.",
      inputSchema: z.object({}),
      execute: async () => {
        return { result: clipToolText(await host.gitPush(), CLIP_COMMAND_CHARS) }
      }
    })
  }
}
