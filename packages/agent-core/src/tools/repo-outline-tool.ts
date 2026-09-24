// @ts-nocheck — 与 createCodingTools 相同：Zod 4 + AI SDK Tool 泛型。
/**
 * repo_outline：按需再取一份受限目录骨架。
 */
import { tool } from "ai"
import { z } from "zod"
import type { AgentWorkspaceHost } from "../runtime-context.ts"
import { collectRepoOutline, formatRepoOutline } from "../context/repo-outline.ts"
import { CLIP_FILE_CHARS, clipToolText } from "./clip-tool-text.ts"

export function createRepoOutlineTool(host: AgentWorkspaceHost) {
  return {
    repo_outline: tool({
      description:
        "Return a depth-limited workspace outline (entry files and directories). Use this before globbing the whole repo.",
      inputSchema: z.object({
        maxDepth: z.number().int().min(1).max(4).optional()
      }),
      execute: async ({ maxDepth }: { maxDepth?: number }) => {
        // 大纲会扫子目录，禁止记 touch，否则下一跳灌进所有嵌套 AGENTS.md。
        const nodes = await collectRepoOutline(
          (path) => host.listDir(path, { touch: false }),
          { maxDepth }
        )
        return {
          outline: clipToolText(formatRepoOutline(nodes), CLIP_FILE_CHARS),
          count: nodes.length
        }
      }
    })
  }
}
