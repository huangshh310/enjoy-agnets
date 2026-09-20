/**
 * 本机 CLI ACP 开流：覆盖只含 path/args。
 * 绑定 Enjoy 供应商时读 vault Key，只注入子进程 env，不进 renderer。
 * Fast / Enjoy 五档不进 ACP。thoughtLevel 在 session/new 后走 set_config_option。
 */
import { isAcpHostRuntime, streamAcpTurn } from "@enjoy-agents/agent-harness"
import { isCustomAgentId } from "@enjoy-agents/ipc-contract"
import { getCustomAgent, resolveCustomCwd } from "./agent-tools-custom"
import { listAgentTools } from "./agent-tools-service"
import { assertAndClampBind } from "./agent-tools-bind-assert"
import { readAgentToolOverrides, readSessionModels } from "./agent-tools-vault"
import { providerEnvFor, requireBindProfile } from "./provider-bind-env"
import { readVault } from "./secrets-vault"
import type { OpenedCodingStream } from "./open-coding-stream"
import { looksLikeSshRoot } from "./ssh/refuse-local-cwd.ts"
import { resolveAcpSpawnDirect } from "./ssh/resolve-acp-spawn.ts"
import { hostExtensionsFor } from "./host-extensions/host-extensions.ts"
import { getWorkspace } from "./workspace"
import { readAcpSessionBind, writeAcpSessionBind } from "./acp-session-bind.ts"
export async function openAcpStream(input: {
  runId: string
  sessionId: string
  runtimeId: string
  workspaceRoot: string
  workspaceId?: string
  messages: Parameters<typeof streamAcpTurn>[0]["messages"]
  abortSignal: AbortSignal
  waitForSubagentApproval?: Parameters<typeof streamAcpTurn>[0]["waitForApproval"]
  /** ACP 思考档：session/new 后 set_config_option，不进 argv。 */
  effort?: string
  thoughtLevel?: string
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
  const sessionModel = readSessionModels()[input.sessionId]?.trim()
  let boundModel = sessionModel || override?.modelId || publicTool?.selectedModel
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

  const spawnDirect = await resolveAcpSpawnDirect({
    workspaceId: input.workspaceId,
    runtimeId: input.runtimeId,
    workspaceRoot: input.workspaceRoot,
    extraArgs: override?.extraArgs ?? [],
    modelId: boundModel
  })
  const extensions = await hostExtensionsFor({
    runtimeId: input.runtimeId,
    workspaceRoot: input.workspaceRoot,
    ssh: Boolean(spawnDirect),
    workspaceId: input.workspaceId
  })
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
    spawnDirect,
    waitForApproval: input.waitForSubagentApproval,
    customInstructions: input.customInstructions,
    mcpServers: extensions.mcpServers,
    skillCatalog: extensions.skillCatalog,
    pluginDirs: extensions.pluginDirs,
    thoughtLevel: input.thoughtLevel,
    resumeSessionId: resumeIdFor(input.sessionId, input.runtimeId),
    onSessionBound: (acpSessionId) => writeAcpSessionBind(input.sessionId, input.runtimeId, acpSessionId)
  })
  return {
    stream: opened.stream,
    result: opened.result,
    dispose: opened.dispose,
    hostInject: extensions.inject
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
  if (input.workspaceId) {
    const workspace = await getWorkspace(input.workspaceId)
    if (workspace.kind === "ssh") {
      throw new Error("自定义助手暂不支持远程工作区")
    }
  } else if (looksLikeSshRoot(input.workspaceRoot)) {
    throw new Error("自定义助手暂不支持远程工作区")
  }
  const cwd = resolveCustomCwd(record, input.workspaceRoot)
  const extensions = await hostExtensionsFor({
    runtimeId: input.runtimeId,
    workspaceRoot: cwd
  })
  const opened = await streamAcpTurn({
    runId: input.runId,
    sessionId: input.sessionId,
    toolId: input.runtimeId,
    workspaceRoot: cwd,
    messages: input.messages,
    abortSignal: input.abortSignal,
    override: {
      binaryPath: record.command,
      extraArgs: record.args,
      modelId: record.modelId
    },
    env: record.env,
    waitForApproval: input.waitForSubagentApproval,
    customInstructions: input.customInstructions,
    mcpServers: extensions.mcpServers,
    skillCatalog: extensions.skillCatalog,
    pluginDirs: extensions.pluginDirs,
    thoughtLevel: input.thoughtLevel,
    resumeSessionId: resumeIdFor(input.sessionId, input.runtimeId),
    onSessionBound: (acpSessionId) => writeAcpSessionBind(input.sessionId, input.runtimeId, acpSessionId)
  })
  return {
    stream: opened.stream,
    result: opened.result,
    dispose: opened.dispose,
    hostInject: extensions.inject
  }
}

function resumeIdFor(sessionId: string, runtimeId: string): string | undefined {
  const bind = readAcpSessionBind(sessionId)
  if (!bind || bind.runtimeId !== runtimeId) return undefined
  return bind.acpSessionId
}


