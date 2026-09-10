// @ts-nocheck — Zod 4 object schemas are runtime-valid with AI SDK 7; the
// published FlexibleSchema types still track Zod 3's ZodType shape.
/**
 * 写盘 / shell / 提交。plan/ask 不得注册这些工具。
 */
import { tool } from "ai"
import { z } from "zod"
import { diffTexts, toUnifiedDiff } from "../diff.ts"
import type { AgentWorkspaceHost } from "../runtime-context.ts"
import { createCodeModeTool } from "./code-mode.ts"
import { createGitWriteTools } from "./git-write-tools.ts"

const MAX_TOOL_CHARS = 80_000

function truncate(value: string): string {
  if (value.length <= MAX_TOOL_CHARS) return value
  return `${value.slice(0, MAX_TOOL_CHARS)}\n...[truncated]`
}

async function readExisting(host: AgentWorkspaceHost, path: string): Promise<string> {
  try {
    return await host.readFile(path)
  } catch {
    return ""
  }
}

/** 突变工具：写盘、bash、提交、code_mode。 */
export function createWriteTools(host: AgentWorkspaceHost) {
  return {
    edit_file: tool({
      description: "Replace an exact string in a workspace file. Requires user approval.",
      inputSchema: z.object({
        path: z.string(),
        oldText: z.string(),
        newText: z.string()
      }),
      execute: async ({ path, oldText, newText }) => {
        const before = await host.readFile(path)
        const after = await host.editFile(path, oldText, newText)
        const model = diffTexts(before, after, path)
        return {
          path,
          additions: model.additions,
          deletions: model.deletions,
          diff: truncate(toUnifiedDiff(model))
        }
      }
    }),
    write_file: tool({
      description: "Create or overwrite a workspace file. Requires user approval.",
      inputSchema: z.object({
        path: z.string(),
        content: z.string()
      }),
      execute: async ({ path, content }) => {
        const before = await readExisting(host, path)
        await host.writeFile(path, content)
        const model = diffTexts(before, content, path)
        return {
          path,
          bytes: content.length,
          additions: model.additions,
          deletions: model.deletions,
          diff: truncate(toUnifiedDiff(model))
        }
      }
    }),
    bash: tool({
      description: "Run a shell command with cwd locked to the workspace. Requires user approval.",
      inputSchema: z.object({
        command: z.string()
      }),
      execute: async ({ command }) => {
        const result = await host.bash(command)
        return {
          command,
          exitCode: result.exitCode,
          stdout: truncate(result.stdout),
          stderr: truncate(result.stderr)
        }
      }
    }),
    ...createGitWriteTools(host),
    code_mode: createCodeModeTool(host)
  }
}
