/**
 * Enjoy Local ToolLoop 开流：密钥、Fast 模型、规则/技能/大纲尾巴。
 */
import type { ModelMessage } from "ai"
import { insertRunStep } from "@enjoy-agents/db"
import {
  collectRepoOutline,
  formatExecutePlanInstructions,
  formatRepoOutline,
  streamCodingAgent,
  type AgentWorkspaceHost,
  type ApprovalPolicy,
  type SkillHost
} from "@enjoy-agents/agent-core"
import {
  createLanguageModel,
  reasoningCallOptions
} from "@enjoy-agents/providers"
import { getDatabase } from "./database"
import { createId } from "./ids"
import { formatWorkspaceAgentsMd } from "./agents-md-discover"
import { createInstructionTouchLog } from "./agents-md-touch-log"
import { extraLocalInstructions } from "./inspect-prompt-instructions"
import { createMcpAgentTools } from "./mcp-agent-tools"
import { createBuiltinAgentTools } from "./builtin-tools/builtin-agent-tools"
import type { OpenedCodingStream, OpenCodingStreamInput } from "./open-coding-stream-input"
import { listDiscoveredRules } from "./rules-service"
import type { StoredSecret } from "./secrets"
import { getSessionCompaction } from "./session-compaction-service"
import { createSkillHost } from "./skill-host"
import { listInstalledSkills } from "./skills-service"
import { looksLikeSshRoot } from "./ssh/refuse-local-cwd.ts"
import { disconnectedError } from "./ssh/ssh-errors.ts"
import { createWorkspaceHost, getWorkspace } from "./workspace"
import { resolveWorkspaceHost } from "./workspace-host-factory.ts"

/** 本机 ToolLoop：需要供应商密钥。Fast 开且配了 fastModelId 才换模型。 */
export async function openLocalStream(
  input: OpenCodingStreamInput,
  policy: ApprovalPolicy
): Promise<OpenedCodingStream> {
  const secret = requireLocalSecret(input.secret)
  const modelId = localFastModelId(input.fast, secret.fastModelId, input.modelId)
  const thinking = reasoningCallOptions({
    provider: secret.provider,
    modelId,
    apiStyle: secret.apiStyle,
    effort: input.effort,
    baseURL: secret.baseURL
  })
  const extras = await loadLocalStreamExtras(input)
  const result = await streamCodingAgent(
    localStreamOptions(input, policy, secret, modelId, thinking, extras)
  )
  return openedLocalStream(result)
}

type LocalStreamExtras = {
  extraInstructions: string
  skills: SkillHost
  exploreModel?: ReturnType<typeof createLanguageModel>
  host: AgentWorkspaceHost
  pullInstructionUpdates?: () => ModelMessage[]
}

function localStreamOptions(
  input: OpenCodingStreamInput,
  policy: ApprovalPolicy,
  secret: StoredSecret,
  modelId: string,
  thinking: ReturnType<typeof reasoningCallOptions>,
  extras: LocalStreamExtras
) {
  return {
    model: languageModelFor(secret, modelId, input),
    mode: input.mode,
    messages: input.messages,
    abortSignal: input.abortSignal,
    reasoning: thinking.reasoning,
    providerOptions: thinking.providerOptions,
    policy,
    extraTools: {
      ...createMcpAgentTools({ mode: input.mode }),
      ...createBuiltinAgentTools(input.mode)
    },
    waitForSubagentApproval: input.waitForSubagentApproval,
    onSubagentToolEvent: input.onSubagentToolEvent,
    maxSteps: input.prefs.maxAgentSteps,
    stepTimeoutMs: input.prefs.stepTimeoutMs,
    toolTimeoutMs: input.prefs.toolTimeoutMs,
    onStepFinish: (step: { stepNumber?: number }) =>
      recordLocalModelStep(input.runId, step.stepNumber),
    pullSteeringMessages: input.pullSteeringMessages,
    pullInstructionUpdates: extras.pullInstructionUpdates,
    extraInstructions: extras.extraInstructions,
    skills: extras.skills,
    exploreModel: extras.exploreModel,
    runtimeContext: {
      workspaceRoot: input.workspaceRoot,
      sessionId: input.sessionId,
      runId: input.runId,
      host: extras.host
    }
  }
}

async function loadLocalStreamExtras(input: OpenCodingStreamInput): Promise<LocalStreamExtras> {
  const agents = await loadAgentsMdStream(input)
  const extras = {
    takeQuestionAnswers: input.takeQuestionAnswers,
    onTouchedPath: agents.onTouchedPath
  }
  const record = input.workspaceId ? await getWorkspace(input.workspaceId) : null
  if (!record && looksLikeSshRoot(input.workspaceRoot)) {
    throw disconnectedError("io")
  }
  const host = record
    ? resolveWorkspaceHost(record, extras, createWorkspaceHost)
    : createWorkspaceHost(input.workspaceRoot, extras)
  // 大纲会 listDir 子目录；不能走带 touch 的 host，否则会把嵌套 AGENTS.md 一次灌进下一跳。
  const outlineHost = record
    ? resolveWorkspaceHost(record, undefined, createWorkspaceHost)
    : createWorkspaceHost(input.workspaceRoot)
  const nodes = await collectRepoOutline((path) => outlineHost.listDir(path))
  const plan = input.executePlan ? formatExecutePlanInstructions(await readPlanFile(host)) : ""
  const isSsh = record?.kind === "ssh"
  const localScanRoot = isSsh ? undefined : input.workspaceRoot
  return {
    host,
    skills: localScanRoot ? createSkillHost(localScanRoot) : emptyRemoteSkillHost(),
    exploreModel: exploreModelFor(input),
    pullInstructionUpdates: agents.pullInstructionUpdates,
    extraInstructions: extraLocalInstructions({
      customInstructions: input.prefs.customInstructions,
      rules: localScanRoot ? listDiscoveredRules({ workspacePath: localScanRoot }) : [],
      skills: localScanRoot ? listInstalledSkills({ workspacePath: localScanRoot }) : [],
      workspaceRoot: localScanRoot,
      outline: formatRepoOutline(nodes),
      executePlan: plan,
      agentsMd: agents.agentsMd,
      rehydratedAfterCompact: agents.rehydratedAfterCompact
    })
  }
}

/** SSH 不扫本机 user@host:path；全局技能也不假装在远端根下。 */
function emptyRemoteSkillHost(): SkillHost {
  return {
    list: () => [],
    read: async () => {
      throw new Error("Workspace skills are not scanned on SSH remote workspaces.")
    }
  }
}

/** 基线链进 system；touch log 只在模型工具碰到新目录时 drain。SSH 不扫本机假根。 */
async function loadAgentsMdStream(input: OpenCodingStreamInput) {
  const compaction = await getSessionCompaction(input.sessionId)
  const record = input.workspaceId ? await getWorkspace(input.workspaceId) : null
  if (record?.kind === "ssh" || looksLikeSshRoot(input.workspaceRoot)) {
    return {
      agentsMd: "",
      rehydratedAfterCompact: Boolean(compaction),
      onTouchedPath: () => undefined,
      pullInstructionUpdates: () => []
    }
  }
  const touch = createInstructionTouchLog({
    workspaceRoot: input.workspaceRoot,
    initialDirRels: ["."]
  })
  return {
    agentsMd: formatWorkspaceAgentsMd(input.workspaceRoot),
    rehydratedAfterCompact: Boolean(compaction),
    onTouchedPath: (relativePath: string, kind: "file" | "directory") =>
      touch.note(relativePath, kind),
    pullInstructionUpdates: () => touch.takeNew()
  }
}

function languageModelFor(secret: StoredSecret, modelId: string, input: OpenCodingStreamInput) {
  return createLanguageModel({
    provider: secret.provider,
    apiKey: secret.apiKey,
    baseURL: secret.baseURL,
    modelId,
    apiStyle: secret.apiStyle,
    reasoningEffort: input.effort,
    customHeaders: secret.customHeaders,
    customBody: secret.customBody
  })
}

function exploreModelFor(input: OpenCodingStreamInput) {
  const secret = input.secret
  const fastId = secret?.fastModelId?.trim()
  if (!secret || !fastId || fastId === input.modelId) return undefined
  return languageModelFor(secret, fastId, input)
}

async function readPlanFile(host: AgentWorkspaceHost): Promise<string | null> {
  try {
    return await host.readFile("implementation_plan.md")
  } catch {
    return null
  }
}

function requireLocalSecret(secret: StoredSecret | undefined): StoredSecret {
  if (!secret) throw new Error("Add an API key in Settings before running an agent.")
  return secret
}

function recordLocalModelStep(runId: string, stepNumber: number | undefined): void {
  insertRunStep(getDatabase(), {
    id: createId("stp"),
    runId,
    idx: stepNumber ?? 0,
    label: "model-step",
    status: "completed"
  })
}

function openedLocalStream(result: unknown): OpenedCodingStream {
  const stream = (result as { fullStream?: AsyncIterable<Record<string, unknown>> }).fullStream
  if (!stream) throw new Error("Agent stream did not expose fullStream.")
  return { stream, result, dispose: async () => undefined }
}

/** Fast 开且 profile 配了极速模型才切换；没配则保持当前模型。 */
function localFastModelId(fast: boolean | undefined, fastModelId: string | undefined, modelId: string): string {
  const id = fastModelId?.trim()
  return fast && id ? id : modelId
}
