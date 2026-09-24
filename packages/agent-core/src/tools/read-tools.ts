// @ts-nocheck — 与 createCodingTools 相同：Zod 4 + AI SDK Tool 泛型。
/**
 * 只读工作区工具。子 Agent 只用这一组，不能写盘或跑 bash。
 */
import { tool } from "ai"
import { z } from "zod"
import type { AgentWorkspaceHost } from "../runtime-context"
import { CLIP_FILE_CHARS, CLIP_GREP_LINE_CHARS, clipToolText } from "./clip-tool-text.ts"
import { createRepoOutlineTool } from "./repo-outline-tool.ts"

export function createReadTools(host: AgentWorkspaceHost) {
  return {
    read_file: tool({
      description: "Read a UTF-8 file from the workspace. Path is relative to the workspace root.",
      inputSchema: z.object({
        path: z.string().describe("Workspace-relative path")
      }),
      execute: async ({ path }) => {
        const content = await host.readFile(path)
        return { path, content: clipToolText(content, CLIP_FILE_CHARS) }
      }
    }),
    list_dir: tool({
      description: "List files and folders under a workspace directory.",
      inputSchema: z.object({
        path: z.string().default(".").describe("Workspace-relative directory")
      }),
      execute: async ({ path }) => {
        const entries = await host.listDir(path)
        return { path, entries }
      }
    }),
    glob: tool({
      description: "Find files in the workspace by glob pattern.",
      inputSchema: z.object({
        pattern: z.string().describe("Glob, e.g. **/*.ts")
      }),
      execute: async ({ pattern }) => {
        const paths = await host.glob(pattern)
        return { pattern, paths: paths.slice(0, 400) }
      }
    }),
    grep: tool({
      description: "Search file contents in the workspace with a regular expression.",
      inputSchema: z.object({
        pattern: z.string(),
        glob: z.string().optional()
      }),
      execute: async ({ pattern, glob }) => {
        const matches = await host.grep(pattern, glob)
        return { pattern, matches: clipGrepMatches(matches) }
      }
    }),
    ...createRepoOutlineTool(host)
  }
}

export const READ_TOOL_NAMES = ["read_file", "list_dir", "glob", "grep", "repo_outline"] as const

function clipGrepMatches<T extends { text: string }>(matches: T[]): T[] {
  return matches.slice(0, 200).map((match) => ({
    ...match,
    text: clipToolText(match.text, CLIP_GREP_LINE_CHARS)
  }))
}
