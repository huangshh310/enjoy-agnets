/**
 * 本机 CLI ACP 开流：不读 Providers Key，覆盖只含 path/args。
 */
import { isAcpHostRuntime, streamAcpTurn } from "@enjoy-agents/agent-harness"
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
  /** ACP 子命令不认 --fast / --thinking，这里只占位兼容开流入参。 */
  effort?: string
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
      extraArgs: override?.extraArgs ?? [],
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
