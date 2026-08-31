// @ts-nocheck — Zod 4 object schemas are runtime-valid with AI SDK 7; the
// published FlexibleSchema types still track Zod 3's ZodType shape.
import { tool } from "ai"
import { z } from "zod"
import { diffTexts, toUnifiedDiff } from "../diff.ts"
import type { AgentWorkspaceHost } from "../runtime-context.ts"
import { createCodeModeTool } from "./code-mode.ts"
import { createReadTools } from "./read-tools.ts"

const MAX_TOOL_CHARS = 80_000;

function truncate(value: string): string {
  if (value.length <= MAX_TOOL_CHARS) return value;
  return `${value.slice(0, MAX_TOOL_CHARS)}\n...[truncated]`;
}

/**
 * AI SDK 7 的 execute() 只注入 toolsContext[name]，不会把 runtimeContext 放进 options.context。
 * 因此 host 必须在建工具时闭包注入，否则 Allow 后续跑会报 Workspace host is missing。
 */
export function createCodingTools(host: AgentWorkspaceHost) {
  return {
  ...createReadTools(host),
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
      const result = await host.bash(command);
      return {
        command,
        exitCode: result.exitCode,
        stdout: truncate(result.stdout),
        stderr: truncate(result.stderr)
      };
    }
  }),
  git_status: tool({
    description: "Show git status for the workspace.",
    inputSchema: z.object({}),
    execute: async () => {
      return { status: await host.gitStatus() };
    }
  }),
  git_diff: tool({
    description: "Show git diff for the workspace or a single path.",
    inputSchema: z.object({
      path: z.string().optional()
    }),
    execute: async ({ path }) => {
      return { diff: truncate(await host.gitDiff(path)) };
    }
  }),
  git_commit: tool({
    description: "Create a git commit. Requires user approval.",
    inputSchema: z.object({
      message: z.string()
    }),
    execute: async ({ message }) => {
      return { result: await host.gitCommit(message) };
    }
  }),
  code_mode: createCodeModeTool(host)
  }
}

async function readExisting(
  host: AgentWorkspaceHost,
  path: string
): Promise<string> {
  try {
    return await host.readFile(path)
  } catch {
    return ""
  }
}
