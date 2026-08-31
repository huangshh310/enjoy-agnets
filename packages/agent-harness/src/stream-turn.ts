/**
 * 打开一轮 Harness 流：首次 createSession，审批续跑复用同一 session。
 */
import type { ModelMessage } from "ai"
import { createHarnessCodingAgent, type CreateHarnessCodingAgentInput } from "./create-agent"

export type HarnessTurnHandle = {
  stream: AsyncIterable<Record<string, unknown>>
  result: unknown
  dispose: () => Promise<void>
}

type HarnessAgentLike = ReturnType<typeof createHarnessCodingAgent>
type HarnessSession = Awaited<ReturnType<HarnessAgentLike["createSession"]>>

const liveSessions = new Map<string, { agent: HarnessAgentLike; session: HarnessSession }>()

/** 按 runId 启动或续跑 Harness 流。 */
export async function streamHarnessTurn(input: {
  runId: string
  messages: ModelMessage[]
  abortSignal?: AbortSignal
  agentInput: CreateHarnessCodingAgentInput
}): Promise<HarnessTurnHandle> {
  const existing = liveSessions.get(input.runId)
  // 每轮按最新 policy 重建 agent，让会话放行能写进静态 toolApproval。
  const agent = createHarnessCodingAgent(input.agentInput)
  const session = existing?.session ?? (await agent.createSession())
  liveSessions.set(input.runId, { agent, session })

  const result = await agent.stream({
    session,
    messages: input.messages,
    abortSignal: input.abortSignal
  })
  const stream = pickStream(result)
  return {
    stream,
    result,
    dispose: () => disposeHarnessTurn(input.runId)
  }
}

export async function disposeHarnessTurn(runId: string): Promise<void> {
  const live = liveSessions.get(runId)
  liveSessions.delete(runId)
  if (!live) return
  await live.session.destroy()
}

function pickStream(result: unknown): AsyncIterable<Record<string, unknown>> {
  const record = result as {
    fullStream?: AsyncIterable<Record<string, unknown>>
    stream?: AsyncIterable<Record<string, unknown>>
  }
  const stream = record.fullStream ?? record.stream
  if (!stream) throw new Error("Harness stream did not expose fullStream or stream.")
  return stream
}
