/**
 * Composer / Agent 一轮的 run.start。纯函数，emitRunStart 与测试共用。
 * clientRequestId 原样带回：渲染端按它认出「认领前已被用户停掉的那一发」（停止后马上再发一句，新旧两发同会话、都在认领前）。
 */
import type { RunAgentInput, StreamEvent } from "@enjoy-agents/ipc-contract"
import { isInternalTodoContinueTurn } from "./outgoing-user-persist"

export function runStartEvent(
  input: RunAgentInput,
  runId: string,
  promptEcho?: boolean
): StreamEvent & { type: "run.start" } {
  const echoed = promptEcho && !isInternalTodoContinueTurn(input) ? lastUserContent(input) : ""
  const echoedId = echoed ? lastOutgoingUser(input)?.id : undefined
  return {
    type: "run.start",
    runId,
    sessionId: input.sessionId,
    kind: "agent",
    ...(echoed ? { prompt: echoed } : {}),
    // leo #147 MF-1：代发用户句落库用的就是这个 id，气泡直接用它。
    ...(echoed && echoedId && echoedId.length <= 128 ? { promptMessageId: echoedId } : {}),
    ...(input.clientRequestId ? { clientRequestId: input.clientRequestId } : {})
  }
}

export function lastOutgoingUser(input: RunAgentInput): RunAgentInput["messages"][number] | undefined {
  return [...input.messages].reverse().find((message) => message.role === "user")
}

export function lastUserContent(input: RunAgentInput): string {
  const content = lastOutgoingUser(input)?.content
  return typeof content === "string" ? content.trim() : ""
}
