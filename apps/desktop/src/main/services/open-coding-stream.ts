/**
 * 按 runtimeId / 偏好打开 Enjoy Local、本机 ACP 或 SDK 沙箱流。
 */
import {
  acpSessionAlive,
  cancelAcpTurn,
  disposeAcpTurn,
  disposeHarnessTurn,
  isAcpHostRuntime,
  resolveHarnessAdapter,
  streamHarnessTurn
} from "@enjoy-agents/agent-harness"
import { createE2eStubStream, isE2eStub } from "./e2e-stub"
import { readHarnessSecret } from "./harness-secrets"
import { captureOpenStreamPrompt } from "./inspect-prompt-service"
import { openAcpStream } from "./open-acp-stream"
import {
  approvalPolicyFromPrefs,
  type OpenCodingStreamInput,
  type OpenedCodingStream
} from "./open-coding-stream-input"
import { assembleHostInject } from "./host-extensions/assemble-host-inject.ts"
import { openLocalStream } from "./open-coding-stream-local"
import { findProfileByKinds } from "./secrets"

export type { OpenedCodingStream, OpenCodingStreamInput } from "./open-coding-stream-input"

/** 按偏好打开本机 ToolLoop 或 Claude Code Harness 流。 */
export async function openCodingStream(
  input: OpenCodingStreamInput
): Promise<OpenedCodingStream> {
  const policy = approvalPolicyFromPrefs(input)
  if (isE2eStub()) return rememberOpened(input, openedE2eStub(input))
  if (isAcpHostRuntime(input.runtimeId)) {
    return rememberOpened(input, await openedAcpStream(input))
  }
  if (input.prefs.codingRuntime === "harness") {
    return rememberOpened(input, await openHarnessStream(input, policy))
  }
  return rememberOpened(input, await openLocalStream(input, policy))
}

/** 开流成功才盖 last-run。失败不得留下假「本轮实发」。 */
async function rememberOpened(
  input: OpenCodingStreamInput,
  opened: OpenedCodingStream
): Promise<OpenedCodingStream> {
  await captureOpenStreamPrompt(input)
  return opened
}

function openedE2eStub(input: OpenCodingStreamInput): OpenedCodingStream {
  return {
    stream: createE2eStubStream(input.messages, input.abortSignal),
    result: {},
    dispose: async () => undefined,
    hostInject: assembleHostInject({
      runtimeId: input.runtimeId ?? "enjoy-local",
      mcpEnabled: [],
      mcpInjected: [],
      skillEnabled: [],
      skillInjected: []
    })
  }
}

function openedAcpStream(input: OpenCodingStreamInput): Promise<OpenedCodingStream> {
  return openAcpStream({
    runId: input.runId,
    sessionId: input.sessionId,
    runtimeId: input.runtimeId ?? "",
    workspaceRoot: input.workspaceRoot,
    workspaceId: input.workspaceId,
    messages: input.messages,
    abortSignal: input.abortSignal,
    waitForSubagentApproval: input.waitForSubagentApproval,
    effort: input.effort,
    fast: input.fast,
    customInstructions: input.prefs.customInstructions
  })
}

/** 按当前 Provider 选 Harness 适配器；模型 key 来自 Providers。 */
async function openHarnessStream(
  input: OpenCodingStreamInput,
  policy: ReturnType<typeof approvalPolicyFromPrefs>
): Promise<OpenedCodingStream> {
  const adapter = resolveHarnessAdapter(input.prefs.harnessId, input.secret?.provider)
  const sandbox = readHarnessSecret()
  const provider = adapter ? await findProfileByKinds(adapter.providerKinds) : undefined
  const opened = await streamHarnessTurn({
    runId: input.runId,
    messages: input.messages,
    abortSignal: input.abortSignal,
    agentInput: {
      adapterId: adapter?.id,
      providerKind: input.secret?.provider,
      mode: input.mode,
      policy,
      credentials: {
        providerApiKey: provider?.apiKey || sandbox?.anthropicApiKey || "",
        vercelToken: sandbox?.vercelToken,
        vercelTeamId: sandbox?.vercelTeamId,
        vercelProjectId: sandbox?.vercelProjectId
      },
      customInstructions: input.prefs.customInstructions,
      workspaceRoot: input.workspaceRoot
    }
  })
  return {
    stream: opened.stream,
    result: opened.result,
    dispose: opened.dispose,
    hostInject: assembleHostInject({
      runtimeId: input.runtimeId ?? "sandbox-harness",
      mcpEnabled: [],
      mcpInjected: [],
      skillEnabled: [],
      skillInjected: []
    })
  }
}

/** Stop：取消当前 turn，ACP 进程留下给下一轮。 */
export async function cancelCodingStream(runId: string): Promise<void> {
  await disposeHarnessTurn(runId)
  await cancelAcpTurn(runId)
}

/** 换引擎 / 删会话 / CLI 已死：拆掉 Harness 与 ACP 子进程。 */
export async function disposeCodingStream(runId: string): Promise<void> {
  await disposeHarnessTurn(runId)
  await disposeAcpTurn(runId)
}

export { acpSessionAlive }
