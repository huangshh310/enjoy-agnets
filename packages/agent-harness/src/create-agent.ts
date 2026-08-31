/**
 * 按适配器目录创建 HarnessAgent。
 * Claude Code 用 Providers 里的 Anthropic key；Vercel 只当沙箱，不是模型供应商。
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
import { resolveHarnessAdapter, type HarnessAdapterId } from "./catalog"
import { inactiveToolsForMode } from "./inactive-tools"
import { collectWorkspaceTexts } from "./sync-workspace"

export type HarnessCredentials = {
  providerApiKey: string
  vercelToken?: string
  vercelTeamId?: string
  vercelProjectId?: string
}

export type CreateHarnessCodingAgentInput = {
  adapterId?: HarnessAdapterId | string
  providerKind?: string
  mode: AgentMode
  policy: ApprovalPolicy
  credentials: HarnessCredentials
  model?: string
  customInstructions?: string
  workspaceRoot?: string
}

/** 创建可 stream / createSession 的编码 Harness。 */
export function createHarnessCodingAgent(input: CreateHarnessCodingAgentInput) {
  const adapter = resolveHarnessAdapter(input.adapterId, input.providerKind)
  if (!adapter?.available) {
    throw new Error(missingAdapterMessage(input.adapterId, input.providerKind))
  }
  if (adapter.id === "claude-code") return createClaudeCodeAgent(input)
  throw new Error(`Harness adapter '${adapter.id}' is not wired yet.`)
}

function createClaudeCodeAgent(input: CreateHarnessCodingAgentInput) {
  const key = input.credentials.providerApiKey.trim()
  const token = input.credentials.vercelToken?.trim()
  if (!key) {
    throw new Error("Add an Anthropic provider in Settings → Providers.")
  }
  if (!token) {
    throw new Error("Claude Code needs a Vercel Sandbox token in Settings → Agent.")
  }

  const settings = toHarnessApprovalSettings(input.mode, input.policy)
  const inactiveTools = inactiveToolsForMode(input.mode)
  const instructions = [systemPromptFor(input.mode), input.customInstructions?.trim()]
    .filter(Boolean)
    .join("\n")

  return new HarnessAgent({
    harness: createClaudeCode({
      env: { ANTHROPIC_API_KEY: key }
    }),
    sandbox: createVercelSandbox({
      runtime: "node24",
      ports: [4000],
      token,
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

function missingAdapterMessage(adapterId?: string, providerKind?: string): string {
  const target = adapterId || providerKind || "this provider"
  return `No Harness for ${target} yet. Use Local (ToolLoop) or pick a provider that has an adapter.`
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
