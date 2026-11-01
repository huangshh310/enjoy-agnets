// @ts-nocheck — 与 createCodingTools 相同：Zod 4 + AI SDK Tool 泛型。
/**
 * repo_outline：优先符号地图；SSH / wasm 失败时诚实降级为目录骨架。
 */
import { tool } from "ai"
import { z } from "zod"
import type { AgentWorkspaceHost } from "../runtime-context.ts"
import { buildRepoMap } from "../context/repo-map/index.ts"
import { CLIP_FILE_CHARS, clipToolText } from "./clip-tool-text.ts"

export type RepoOutlineToolOptions = {
  /** 单测强制目录模式 / 覆盖 host.isRemote。 */
  forceDirectoryMode?: boolean
  /** 单测强制 wasm init 失败。 */
  forceWasmInitFailure?: boolean
  assetsDir?: string
}

export function createRepoOutlineTool(host: AgentWorkspaceHost, options?: RepoOutlineToolOptions) {
  return {
    repo_outline: tool({
      description:
        "Return a workspace symbol map (top-level/export signatures) within a small token budget, or a depth-limited directory outline when the symbol map is unavailable. Use this before globbing the whole repo.",
      inputSchema: z.object({
        maxDepth: z.number().int().min(1).max(4).optional()
      }),
      execute: async ({ maxDepth }: { maxDepth?: number }) => {
        // 大纲会扫子目录，禁止记 touch，否则下一跳灌进所有嵌套 AGENTS.md。
        const forceDirectoryMode =
          options?.forceDirectoryMode === true || host.isRemote === true
        const result = await buildRepoMap(
          (path) => host.listDir(path, { touch: false }),
          (path) => host.readFile(path),
          {
            maxDepth,
            forceDirectoryMode,
            wasm: {
              forceInitFailure: options?.forceWasmInitFailure === true,
              assetsDir: options?.assetsDir
            }
          }
        )
        return {
          outline: clipToolText(result.outline, CLIP_FILE_CHARS),
          count: result.count,
          mode: result.mode,
          occupancy: result.occupancy
        }
      }
    })
  }
}
