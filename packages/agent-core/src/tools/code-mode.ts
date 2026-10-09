/**
 * Code Mode：先写脚本再在锁定 cwd 的 sandbox 里执行。必须审批。
 */
import { tool } from "ai"
import { z } from "zod"
import type { AgentWorkspaceHost } from "../runtime-context"
import { modelCommandText } from "./command-display.ts"

export function createCodeModeTool(host: AgentWorkspaceHost) {
  return tool({
    description: "Write a short script then run it in the local sandbox. Requires approval.",
    inputSchema: z.object({
      path: z.string(),
      source: z.string(),
      command: z.string()
    }),
    execute: async ({ path, source, command }, options: { toolCallId?: string }) => {
      await host.writeFile(path, source)
      const result = await host.bash(command)
      const model = modelCommandText(options?.toolCallId, result.stdout, result.stderr)
      return { path, exitCode: result.exitCode, stdout: model.stdout, stderr: model.stderr }
    }
  })
}
