/**
 * 本机 CLI ACP 开流：不读 Providers Key，覆盖只含 path/args。
 * fast / effort 入参只占位兼容，不进 argv；env 注入跟 providerBind。
 */
import { isAcpHostRuntime, streamAcpTurn } from "@enjoy-agents/agent-harness"
import { capabilitiesFor, isCustomAgentId } from "@enjoy-agents/ipc-contract"
import { getCustomAgent, resolveCustomCwd } from "./agent-tools-custom"
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
  /** ACP 忽略 Fast / 思考档；切回 Local 时 store 里的值仍保留。 */
  effort?: string
  fast?: boolean
}): Promise<OpenedCodingStream> {
  if (!isAcpHostRuntime(input.runtimeId)) {
    throw new Error(`${input.runtimeId} is not a wired ACP host runtime.`)
  }
  if (isCustomAgentId(input.runtimeId)) {
    return openCustomAcpStream(input)
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
      injectedEnv = providerEnvFor(input.runtimeId, profile)
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

/** 自定义 ACP：command/args/env/cwd 入库值，审批不豁免。 */
async function openCustomAcpStream(
  input: Parameters<typeof openAcpStream>[0]
): Promise<OpenedCodingStream> {
  const record = getCustomAgent(input.runtimeId)
  if (!record || !record.enabled) {
    throw new Error(`${input.runtimeId} is not a registered custom ACP agent.`)
  }
  const opened = await streamAcpTurn({
    runId: input.runId,
    sessionId: input.sessionId,
    toolId: input.runtimeId,
    workspaceRoot: resolveCustomCwd(record, input.workspaceRoot),
    messages: input.messages,
    abortSignal: input.abortSignal,
    override: {
      binaryPath: record.command,
      extraArgs: record.args,
      modelId: record.modelId
    },
    env: record.env,
    waitForApproval: input.waitForSubagentApproval
  })
  return {
    stream: opened.stream,
    result: opened.result,
    dispose: opened.dispose
  }
}

/** Claude → ANTHROPIC_*，Codex → OPENAI_*。未声明 providerBind 不注入。 */
function providerEnvFor(
  runtimeId: string,
  profile: { baseURL?: string; apiKey: string }
): Record<string, string> | undefined {
  const bind = capabilitiesFor(runtimeId).providerBind
  if (bind === "anthropic") {
    return {
      ANTHROPIC_BASE_URL: profile.baseURL || "https://api.anthropic.com",
      ANTHROPIC_API_KEY: profile.apiKey,
      ANTHROPIC_AUTH_TOKEN: profile.apiKey
    }
  }
  if (bind === "openai") {
    return {
      OPENAI_BASE_URL: profile.baseURL || "https://api.openai.com/v1",
      OPENAI_API_KEY: profile.apiKey
    }
  }
  if (bind === "deepseek") {
    const env: Record<string, string> = { DEEPSEEK_API_KEY: profile.apiKey }
    if (profile.baseURL?.trim()) env.DEEPSEEK_BASE_URL = profile.baseURL.trim()
    return env
  }
  return undefined
}
