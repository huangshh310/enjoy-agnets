// @ts-nocheck — Zod 4 object schemas are runtime-valid with AI SDK 7; the
// published FlexibleSchema types still track Zod 3's ZodType shape.
import { tool } from "ai"
import { z } from "zod"
import { workspaceHostFrom } from "./host"

const MAX_TOOL_CHARS = 80_000;

function truncate(value: string): string {
  if (value.length <= MAX_TOOL_CHARS) return value;
  return `${value.slice(0, MAX_TOOL_CHARS)}\n...[truncated]`;
}

export const codingTools = {
  read_file: tool({
    description: "Read a UTF-8 file from the workspace. Path is relative to the workspace root.",
    inputSchema: z.object({
      path: z.string().describe("Workspace-relative path")
    }),
    execute: async ({ path }, options) => {
      const content = await workspaceHostFrom(options).readFile(path);
      return { path, content: truncate(content) };
    }
  }),
  list_dir: tool({
    description: "List files and folders under a workspace directory.",
    inputSchema: z.object({
      path: z.string().default(".").describe("Workspace-relative directory")
    }),
    execute: async ({ path }, options) => {
      const entries = await workspaceHostFrom(options).listDir(path);
      return { path, entries };
    }
  }),
  glob: tool({
    description: "Find files in the workspace by glob pattern.",
    inputSchema: z.object({
      pattern: z.string().describe("Glob, e.g. **/*.ts")
    }),
    execute: async ({ pattern }, options) => {
      const paths = await workspaceHostFrom(options).glob(pattern);
      return { pattern, paths: paths.slice(0, 400) };
    }
  }),
  grep: tool({
    description: "Search file contents in the workspace with a regular expression.",
    inputSchema: z.object({
      pattern: z.string(),
      glob: z.string().optional()
    }),
    execute: async ({ pattern, glob }, options) => {
      const matches = await workspaceHostFrom(options).grep(pattern, glob);
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
    execute: async ({ path, oldText, newText }, options) => {
      const preview = await workspaceHostFrom(options).editFile(path, oldText, newText);
      return { path, preview: truncate(preview) };
    }
  }),
  write_file: tool({
    description: "Create or overwrite a workspace file. Requires user approval.",
    inputSchema: z.object({
      path: z.string(),
      content: z.string()
    }),
    execute: async ({ path, content }, options) => {
      await workspaceHostFrom(options).writeFile(path, content);
      return { path, bytes: content.length };
    }
  }),
  bash: tool({
    description: "Run a shell command with cwd locked to the workspace. Requires user approval.",
    inputSchema: z.object({
      command: z.string()
    }),
    execute: async ({ command }, options) => {
      const result = await workspaceHostFrom(options).bash(command);
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
    execute: async (_input, options) => {
      return { status: await workspaceHostFrom(options).gitStatus() };
    }
  }),
  git_diff: tool({
    description: "Show git diff for the workspace or a single path.",
    inputSchema: z.object({
      path: z.string().optional()
    }),
    execute: async ({ path }, options) => {
      return { diff: truncate(await workspaceHostFrom(options).gitDiff(path)) };
    }
  }),
  git_commit: tool({
    description: "Create a git commit. Requires user approval.",
    inputSchema: z.object({
      message: z.string()
    }),
    execute: async ({ message }, options) => {
      return { result: await workspaceHostFrom(options).gitCommit(message) };
    }
  })
};
