// @ts-nocheck — Zod 4 object schemas are runtime-valid with AI SDK 7; the
// published FlexibleSchema types still track Zod 3's ZodType shape.
/**
 * 写盘 / shell / 提交。plan/ask 不得注册这些工具。
 */
import { tool } from "ai"
import { z } from "zod"
import { diffTexts, toUnifiedDiff } from "../diff.ts"
import type { AgentWorkspaceHost } from "../runtime-context.ts"
import { CLIP_COMMAND_CHARS, CLIP_FILE_CHARS, clipToolText } from "./clip-tool-text.ts"
import { createCodeModeTool } from "./code-mode.ts"
import { createGitWriteTools } from "./git-write-tools.ts"

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
    edit_file: editFileTool(host),
    write_file: writeFileTool(host),
    bash: bashTool(host),
    ...createGitWriteTools(host),
    code_mode: createCodeModeTool(host)
  }
}

function editFileTool(host: AgentWorkspaceHost) {
  return tool({
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
      return fileChange(path, model)
    }
  })
}

function writeFileTool(host: AgentWorkspaceHost) {
  return tool({
    description: "Create or overwrite a workspace file. Requires user approval.",
    inputSchema: z.object({
      path: z.string(),
      content: z.string()
    }),
    execute: async ({ path, content }) => {
      const before = await readExisting(host, path)
      await host.writeFile(path, content)
      const model = diffTexts(before, content, path)
      return { ...fileChange(path, model), bytes: content.length }
    }
  })
}

function bashTool(host: AgentWorkspaceHost) {
  return tool({
    description: "Run a shell command with cwd locked to the workspace. Requires user approval.",
    inputSchema: z.object({
      command: z.string()
    }),
    execute: async ({ command }) => {
      const result = await host.bash(command)
      return {
        command,
        exitCode: result.exitCode,
        stdout: clipToolText(result.stdout, CLIP_COMMAND_CHARS),
        stderr: clipToolText(result.stderr, CLIP_COMMAND_CHARS)
      }
    }
  })
}

/** 写盘结果只把 unified diff 交给模型，头尾截断。 */
function fileChange(path: string, model: { additions: number; deletions: number }) {
  return {
    path,
    additions: model.additions,
    deletions: model.deletions,
    diff: clipToolText(toUnifiedDiff(model), CLIP_FILE_CHARS)
  }
}
