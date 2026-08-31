// @ts-nocheck — Zod 4 object schemas are runtime-valid with AI SDK 7; the
// published FlexibleSchema types still track Zod 3's ZodType shape.
import { tool } from "ai"
import { z } from "zod"
import { diffTexts, toUnifiedDiff } from "../diff"
import type { AgentWorkspaceHost } from "../runtime-context"

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
  read_file: tool({
    description: "Read a UTF-8 file from the workspace. Path is relative to the workspace root.",
    inputSchema: z.object({
      path: z.string().describe("Workspace-relative path")
    }),
    execute: async ({ path }) => {
      const content = await host.readFile(path);
      return { path, content: truncate(content) };
    }
  }),
  list_dir: tool({
    description: "List files and folders under a workspace directory.",
    inputSchema: z.object({
      path: z.string().default(".").describe("Workspace-relative directory")
    }),
    execute: async ({ path }) => {
      const entries = await host.listDir(path);
      return { path, entries };
    }
  }),
  glob: tool({
    description: "Find files in the workspace by glob pattern.",
    inputSchema: z.object({
      pattern: z.string().describe("Glob, e.g. **/*.ts")
    }),
    execute: async ({ pattern }) => {
      const paths = await host.glob(pattern);
      return { pattern, paths: paths.slice(0, 400) };
    }
  }),
  grep: tool({
    description: "Search file contents in the workspace with a regular expression.",
    inputSchema: z.object({
      pattern: z.string(),
      glob: z.string().optional()
    }),
    execute: async ({ pattern, glob }) => {
      const matches = await host.grep(pattern, glob);
      return { pattern, matches: matches.slice(0, 200) };
    }
  }),
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
  })
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
