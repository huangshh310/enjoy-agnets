/**
 * Realtime 会话 IPC：main 代理 WebSocket，renderer 只传音频帧。
 * 实验能力，必须带 experimental 标记。
 */
import { z } from "zod"

export const RealtimeOpenInput = z
  .object({
    sessionId: z.string().min(1),
    providerId: z.string().optional(),
    modelId: z.string().min(1)
  })
  .strict()
export type RealtimeOpenInput = z.infer<typeof RealtimeOpenInput>

export const RealtimeSendAudioInput = z
  .object({
    runId: z.string().min(1),
    chunkBase64: z.string().min(1)
  })
  .strict()
export type RealtimeSendAudioInput = z.infer<typeof RealtimeSendAudioInput>

export const RealtimeCloseInput = z.object({ runId: z.string().min(1) }).strict()
export type RealtimeCloseInput = z.infer<typeof RealtimeCloseInput>
