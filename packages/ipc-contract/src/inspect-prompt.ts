/**
 * 本轮发给模型的指令 / ModelMessage / 工具名。last-run 来自泵时快照。
 */
import { z } from "zod"
import { AgentMode } from "./chat"

export const InspectPromptInput = z
  .object({
    sessionId: z.string().min(1),
    mode: AgentMode.optional(),
    modelId: z.string().optional()
  })
  .strict()
export type InspectPromptInput = z.infer<typeof InspectPromptInput>

export const InspectPromptMessage = z.object({
  role: z.string(),
  content: z.unknown()
})
export type InspectPromptMessage = z.infer<typeof InspectPromptMessage>

export const InspectPromptResult = z.object({
  source: z.enum(["last-run", "preview"]),
  capturedAt: z.number().int(),
  runId: z.string().optional(),
  sessionId: z.string(),
  modelId: z.string(),
  mode: AgentMode,
  runtime: z.enum(["local", "harness", "e2e"]),
  instructions: z.string(),
  messages: z.array(InspectPromptMessage),
  toolNames: z.array(z.string())
})
export type InspectPromptResult = z.infer<typeof InspectPromptResult>
