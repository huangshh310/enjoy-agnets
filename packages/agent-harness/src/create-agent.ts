/**
 * Claude Code + Vercel Sandbox 的 HarnessAgent。
 * permissionMode 管 Claude Code 内置 write/edit/bash；host toolApproval 管同名静态表。
 * 不把本机 modelId（如 deepseek-chat）传给 Claude CLI，缺省走 CLI 默认模型。
 */
import { HarnessAgent } from "@ai-sdk/harness/agent"
import { createClaudeCode } from "@ai-sdk/harness-claude-code"
import { createVercelSandbox } from "@ai-sdk/sandbox-vercel"
import {
  systemPromptFor,
  toHarnessApprovalSettings,
  type ApprovalPolicy
} from "@enjoy-agents/agent-core"
import type { AgentMode } from "@enjoy-agents/ipc-contract"
import { inactiveToolsForMode } from "./inactive-tools"
import { collectWorkspaceTexts } from "./sync-workspace"

export type HarnessCredentials = {
  anthropicApiKey: string
  vercelToken: string
  vercelTeamId?: string
  vercelProjectId?: string
}

export type CreateHarnessCodingAgentInput = {
  mode: AgentMode
  policy: ApprovalPolicy
  credentials: HarnessCredentials
  model?: string
  customInstructions?: string
  workspaceRoot?: string
}

/** 创建可 stream / createSession 的编码 Harness。 */
export function createHarnessCodingAgent(input: CreateHarnessCodingAgentInput) {
  const settings = toHarnessApprovalSettings(input.mode, input.policy)
  const inactiveTools = inactiveToolsForMode(input.mode)
  const instructions = [systemPromptFor(input.mode), input.customInstructions?.trim()]
    .filter(Boolean)
    .join("\n")

  return new HarnessAgent({
    harness: createClaudeCode({
      env: { ANTHROPIC_API_KEY: input.credentials.anthropicApiKey }
    }),
    sandbox: createVercelSandbox({
      runtime: "node24",
      ports: [4000],
      token: input.credentials.vercelToken,
      teamId: input.credentials.vercelTeamId,
      projectId: input.credentials.vercelProjectId
    }),
    id: "enjoy-agents-claude-code",
    instructions,
    ...claudeModel(input.model),
    permissionMode: settings.permissionMode,
    toolApproval: settings.toolApproval,
    ...(inactiveTools ? { inactiveTools } : {}),
    ...sandboxConfigFor(input.workspaceRoot)
  })
}

const CLAUDE_MODELS = new Set(["sonnet", "opus", "haiku"])

/** 只接受 Claude CLI 短名；其它供应商的 modelId 直接丢掉。 */
function claudeModel(model?: string): { model: string } | Record<string, never> {
  if (!model) return {}
  return CLAUDE_MODELS.has(model) ? { model } : {}
}

function sandboxConfigFor(workspaceRoot?: string) {
  if (!workspaceRoot) return {}
  return {
    sandboxConfig: {
      workDir: "workspace",
      onSession: async (opts: {
        session: { writeTextFile: (file: { path: string; content: string }) => PromiseLike<void> }
        sessionWorkDir: string
      }) => {
        const files = await collectWorkspaceTexts(workspaceRoot)
        for (const file of files) {
          await opts.session.writeTextFile({
            path: `${opts.sessionWorkDir}/${file.path}`,
            content: file.content
          })
        }
      }
    }
  }
}
