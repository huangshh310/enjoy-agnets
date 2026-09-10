/**
 * 本机 CLI ACP 开流：覆盖只含 path/args。
 * 绑定 Enjoy 供应商时读 vault Key，只注入子进程 env，不进 renderer。
 * fast / effort 入参只占位兼容，不进 argv。
 */
import { isAcpHostRuntime, streamAcpTurn } from "@enjoy-agents/agent-harness"
import { isCustomAgentId } from "@enjoy-agents/ipc-contract"
import { getCustomAgent, resolveCustomCwd } from "./agent-tools-custom"
import { listAgentTools } from "./agent-tools-service"
import { assertAndClampBind } from "./agent-tools-bind-assert"
import { readAgentToolOverrides } from "./agent-tools-vault"
import { providerEnvFor, requireBindProfile } from "./provider-bind-env"
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
  /** 垫进 session/prompt；CLI 仍自己读工作区 AGENTS.md。 */
  customInstructions?: string
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

  let injectedEnv: Record<string, string> | undefined
  let boundModel = override?.modelId || publicTool?.selectedModel
  if (override?.useCustomProvider && override?.providerId) {
    const clamped = await assertAndClampBind({
      id: input.runtimeId,
      useCustomProvider: true,
      providerId: override.providerId,
      modelId: boundModel
    })
    boundModel = clamped.modelId
    const vault = await readVault()
    const profile = requireBindProfile(vault.profiles.find((item) => item.id === override.providerId))
    injectedEnv = providerEnvFor(input.runtimeId, profile, boundModel)
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
      modelId: boundModel
    },
    env: injectedEnv,
    waitForApproval: input.waitForSubagentApproval,
    customInstructions: input.customInstructions
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
    waitForApproval: input.waitForSubagentApproval,
    customInstructions: input.customInstructions
  })
  return {
    stream: opened.stream,
    result: opened.result,
    dispose: opened.dispose
  }
}


