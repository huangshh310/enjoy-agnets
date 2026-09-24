/**
 * Code Mode：先写脚本再在锁定 cwd 的 sandbox 里执行。必须审批。
 */
import { tool } from "ai"
import { z } from "zod"
import type { AgentWorkspaceHost } from "../runtime-context"
import { CLIP_COMMAND_CHARS, clipToolText } from "./clip-tool-text.ts"

export function createCodeModeTool(host: AgentWorkspaceHost) {
  return tool({
    description: "Write a short script then run it in the local sandbox. Requires approval.",
    inputSchema: z.object({
      path: z.string(),
      source: z.string(),
      command: z.string()
    }),
    execute: async ({ path, source, command }) => {
      await host.writeFile(path, source)
      const result = await host.bash(command)
      return {
        path,
        exitCode: result.exitCode,
        stdout: clipToolText(result.stdout, CLIP_COMMAND_CHARS),
        stderr: clipToolText(result.stderr, CLIP_COMMAND_CHARS)
      }
    }
  })
}
