/**
 * StreamEvent：v1 兼容事件 + v2 扩展。
 * v2 为每个事件补 sequence / timestamp / sessionId，旧事件字段保持可解析。
 */
import { z } from "zod"
import { HostInjectSnapshot } from "./host-inject.ts"
import { SessionConfigOption } from "./session-config.ts"

const Envelope = {
  sequence: z.number().int().optional(),
  timestamp: z.number().int().optional(),
  sessionId: z.string().optional()
}

export const StreamEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("run.start"),
    runId: z.string(),
    sessionId: z.string(),
    /** 主进程代发的用户句。前台线程还没有这条时才补进气泡。 */
    prompt: z.string().optional(),
    sequence: z.number().int().optional(),
    timestamp: z.number().int().optional()
  }),
  z.object({ type: z.literal("text.delta"), runId: z.string(), text: z.string(), ...Envelope }),
  z.object({ type: z.literal("reasoning.delta"), runId: z.string(), text: z.string(), ...Envelope }),
  z.object({
    type: z.literal("tool.start"),
    runId: z.string(),
    toolCallId: z.string(),
    name: z.string(),
    args: z.unknown().optional(),
    parentToolCallId: z.string().optional(),
    ...Envelope
  }),
  z.object({
    type: z.literal("tool.args.delta"),
    runId: z.string(),
    toolCallId: z.string(),
    delta: z.string(),
    ...Envelope
  }),
  z.object({
    type: z.literal("tool.result"),
    runId: z.string(),
    toolCallId: z.string(),
    name: z.string(),
    result: z.unknown().optional(),
    args: z.unknown().optional(),
    error: z.string().optional(),
    parentToolCallId: z.string().optional(),
    ...Envelope
  }),
  z.object({
    type: z.literal("approval.required"),
    runId: z.string(),
    toolCallId: z.string(),
    approvalId: z.string(),
    name: z.string(),
    args: z.unknown(),
    ...Envelope
  }),
  z.object({
    type: z.literal("approval.resolved"),
    runId: z.string(),
    toolCallId: z.string(),
    decision: z.enum(["allow", "deny", "allow_session"]),
    ...Envelope
  }),
  z.object({
    type: z.literal("file.changed"),
    runId: z.string().optional(),
    path: z.string(),
    kind: z.enum(["created", "modified", "deleted"]),
    ...Envelope
  }),
  z.object({ type: z.literal("run.end"), runId: z.string(), ...Envelope }),
  z.object({ type: z.literal("run.error"), runId: z.string(), message: z.string(), ...Envelope }),
  z.object({
    type: z.literal("message.part.start"),
    runId: z.string(),
    partId: z.string(),
    partType: z.string(),
    ...Envelope
  }),
  // message.part.delta 已删：文本增量走 v1 text.delta，v2 从未有过生产者，避免消费端空等。
  z.object({
    type: z.literal("message.part.end"),
    runId: z.string(),
    partId: z.string(),
    ...Envelope
  }),
  z.object({
    type: z.literal("structured.delta"),
    runId: z.string(),
    partial: z.unknown(),
    ...Envelope
  }),
  z.object({
    type: z.literal("source.added"),
    runId: z.string(),
    sourceId: z.string(),
    title: z.string(),
    path: z.string(),
    startLine: z.number().int().optional(),
    endLine: z.number().int().optional(),
    snippet: z.string().optional(),
    score: z.number().optional(),
    ...Envelope
  }),
  z.object({
    type: z.literal("asset.created"),
    runId: z.string(),
    assetId: z.string(),
    mediaType: z.string(),
    name: z.string(),
    size: z.number().int(),
    experimental: z.boolean().optional(),
    ...Envelope
  }),
  z.object({
    type: z.literal("usage.updated"),
    runId: z.string(),
    inputTokens: z.number().int().optional(),
    outputTokens: z.number().int().optional(),
    totalTokens: z.number().int().optional(),
    durationMs: z.number().int().optional(),
    tokensPerSecond: z.number().optional(),
    ...Envelope
  }),
  z.object({
    type: z.literal("step.start"),
    runId: z.string(),
    stepId: z.string(),
    label: z.string().optional(),
    ...Envelope
  }),
  z.object({
    type: z.literal("step.end"),
    runId: z.string(),
    stepId: z.string(),
    durationMs: z.number().int().optional(),
    ...Envelope
  }),
  z.object({
    type: z.literal("workflow.checkpoint"),
    runId: z.string(),
    checkpointId: z.string(),
    stepIndex: z.number().int(),
    ...Envelope
  }),
  z.object({
    type: z.literal("workflow.paused"),
    runId: z.string(),
    reason: z.string().optional(),
    ...Envelope
  }),
  z.object({
    type: z.literal("workflow.resumed"),
    runId: z.string(),
    checkpointId: z.string().optional(),
    ...Envelope
  }),
  z.object({
    type: z.literal("mcp.tool"),
    runId: z.string(),
    serverId: z.string(),
    toolName: z.string(),
    phase: z.enum(["start", "result", "error"]),
    ...Envelope
  }),
  z.object({
    type: z.literal("mcp.app"),
    runId: z.string(),
    serverId: z.string(),
    resourceUri: z.string(),
    phase: z.enum(["open", "update", "close", "error"]),
    srcDoc: z.string().max(200_000).optional(),
    title: z.string().max(200).optional(),
    ...Envelope
  }),
  z.object({
    type: z.literal("realtime.audio"),
    runId: z.string(),
    chunkBase64: z.string(),
    ...Envelope
  }),
  z.object({
    type: z.literal("realtime.text"),
    runId: z.string(),
    text: z.string(),
    ...Envelope
  }),
  z.object({
    type: z.literal("realtime.status"),
    runId: z.string(),
    status: z.enum(["connecting", "open", "reconnecting", "closed", "error"]),
    message: z.string().optional(),
    experimental: z.literal(true).optional(),
    ...Envelope
  }),
  z.object({
    type: z.literal("generation.warning"),
    runId: z.string(),
    code: z.string(),
    message: z.string(),
    experimental: z.boolean().optional(),
    ...Envelope
  }),
  z.object({
    type: z.literal("commands.update"),
    runId: z.string(),
    commands: z.array(
      z.object({
        name: z.string(),
        description: z.string().optional()
      })
    ),
    ...Envelope
  }),
  z.object({
    type: z.literal("host.inject"),
    runId: z.string(),
    ...HostInjectSnapshot.shape,
    ...Envelope
  }),
  z.object({
    type: z.literal("session.config"),
    runId: z.string(),
    configOptions: z.array(SessionConfigOption),
    ...Envelope
  }),
  z.object({
    type: z.literal("session.title"),
    runId: z.string(),
    title: z.string().min(1).max(200),
    ...Envelope
  })
])
export type StreamEvent = z.infer<typeof StreamEvent>

/** 给事件补上序号与时间戳，供断线重放。 */
export function stampStreamEvent<T extends { type: string }>(
  event: T,
  meta: { sequence: number; sessionId?: string; timestamp?: number }
): T & { sequence: number; timestamp: number; sessionId?: string } {
  return {
    ...event,
    sequence: meta.sequence,
    timestamp: meta.timestamp ?? Date.now(),
    sessionId: meta.sessionId
  }
}
