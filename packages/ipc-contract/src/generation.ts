/**
 * 统一 AI Runtime 入参：ai.generate / abort / resume。
 * 未知字段直接拒；renderer 只传 id，不传密钥。
 */
import { z } from "zod"

const GenerationMessage = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  reasoning: z.string().optional()
})

/** 视频 / Realtime 必须先开 Settings 实验开关。main 与 composer 共用文案。 */
export const EXPERIMENTAL_MEDIA_HINT =
  "Enable experimental media in Settings to use video or realtime."

export const GenerationKind = z.enum([
  "text",
  "structured-object",
  "structured-array",
  "completion",
  "image",
  "speech",
  "transcription",
  "translation",
  "video",
  "embedding",
  "rerank",
  "realtime-session",
  "agent",
  "workflow"
])
export type GenerationKind = z.infer<typeof GenerationKind>

export const TelemetryPolicy = z.enum(["local", "otel", "off"])
export type TelemetryPolicy = z.infer<typeof TelemetryPolicy>

export const GenerationRequest = z
  .object({
    kind: GenerationKind,
    sessionId: z.string().min(1),
    workspaceId: z.string().optional(),
    providerId: z.string().optional(),
    modelId: z.string().min(1),
    prompt: z.string().optional(),
    messages: z.array(GenerationMessage).optional(),
    schemaJson: z.unknown().optional(),
    attachments: z.array(z.string()).default([]),
    timeoutMs: z.number().int().positive().optional(),
    telemetryPolicy: TelemetryPolicy.optional(),
    runtimeContext: z.record(z.string(), z.unknown()).optional(),
    experimental: z.boolean().optional()
  })
  .strict()
  .refine((request) => request.kind !== "agent" || Boolean(request.workspaceId?.trim()), {
    message: "agent generate requires workspaceId",
    path: ["workspaceId"]
  })
export type GenerationRequest = z.infer<typeof GenerationRequest>

export const AiGenerateInput = GenerationRequest
export type AiGenerateInput = GenerationRequest

export const AiAbortInput = z.object({ runId: z.string().min(1) }).strict()
export type AiAbortInput = z.infer<typeof AiAbortInput>

export const AiResumeInput = z.object({ runId: z.string().min(1) }).strict()
export type AiResumeInput = z.infer<typeof AiResumeInput>

export const AiGenerateResult = z.object({
  runId: z.string(),
  kind: GenerationKind
})
export type AiGenerateResult = z.infer<typeof AiGenerateResult>
