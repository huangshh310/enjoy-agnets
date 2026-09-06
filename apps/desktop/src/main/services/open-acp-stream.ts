/**
 * 本机 CLI ACP 开流：不读 Providers Key，覆盖只含 path/args。
 */
import { isAcpHostRuntime, streamAcpTurn } from "@enjoy-agents/agent-harness"
import type { ReasoningEffort } from "@enjoy-agents/ipc-contract"
import { listAgentTools } from "./agent-tools-service"
import { readAgentToolOverrides } from "./agent-tools-vault"
import { readVault } from "./secrets-vault"
import type { OpenedCodingStream } from "./open-coding-stream"
export async function openAcpStream(input: {
  runId: string
  sessionId: string
  runtimeId: string
  workspaceRoot: string
  messages: Parameters<typeof streamAcpTurn>[0]["messages"]
  abortSignal: AbortSignal
  waitForSubagentApproval?: Parameters<typeof streamAcpTurn>[0]["waitForApproval"]
  effort?: ReasoningEffort
  fast?: boolean
}): Promise<OpenedCodingStream> {
  if (!isAcpHostRuntime(input.runtimeId)) {
    throw new Error(`${input.runtimeId} is not a wired ACP host runtime.`)
  }
  const override = readAgentToolOverrides()[input.runtimeId]
  const listed = await listAgentTools()
  const publicTool = listed.find((item) => item.id === input.runtimeId)
  const detected = override?.binaryPath ? undefined : publicTool?.detectedPath

  // 如果绑定了自定义供应商并开启了注入，组装对应协议的环境变量
  let injectedEnv: Record<string, string> | undefined
  if (override?.useCustomProvider && override?.providerId) {
    const vault = await readVault()
    const profile = vault.profiles.find((p) => p.id === override.providerId)
    if (profile && profile.apiKey.trim()) {
      if (input.runtimeId === "claude") {
        injectedEnv = {
          ANTHROPIC_BASE_URL: profile.baseURL || "https://api.anthropic.com",
          ANTHROPIC_API_KEY: profile.apiKey,
          ANTHROPIC_AUTH_TOKEN: profile.apiKey
        }
      } else if (input.runtimeId === "codex") {
        injectedEnv = {
          OPENAI_BASE_URL: profile.baseURL || "https://api.openai.com/v1",
          OPENAI_API_KEY: profile.apiKey
        }
      }
    }
  }

  const opened = await streamAcpTurn({
    runId: input.runId,
    sessionId: input.sessionId,
    toolId: input.runtimeId,
    workspaceRoot: input.workspaceRoot,
    messages: input.messages,
    abortSignal: input.abortSignal,
    override: {
      binaryPath: override?.binaryPath || detected || undefined,
      extraArgs: buildCliArgsWithEffort(override?.extraArgs ?? [], input.effort, input.fast),
      modelId: override?.modelId || publicTool?.selectedModel
    },
    env: injectedEnv,
    waitForApproval: input.waitForSubagentApproval
  })
  return {
    stream: opened.stream,
    result: opened.result,
    dispose: opened.dispose
  }
}

function buildCliArgsWithEffort(baseArgs: string[], effort?: ReasoningEffort, fast?: boolean): string[] {
  const args = [...baseArgs]
  if (fast && !args.includes("--fast")) {
    args.push("--fast")
  }
  if (effort === "high" || effort === "xhigh") {
    if (!args.includes("--thinking=max") && !args.includes("--thinking")) {
      args.push("--thinking=max")
    }
  } else if (effort === "medium" || effort === "low") {
    if (!args.includes("--thinking") && !args.includes("--thinking=max")) {
      args.push("--thinking")
    }
  }
  return args
}
