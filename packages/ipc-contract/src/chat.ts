/**
 * Agent 会话消息与跑循环入参。
 */
import { z } from "zod"
import { ReasoningEffort as ReasoningEffortSchema } from "./reasoning-effort"

export const AgentMode = z.enum(["agent", "plan", "ask", "debug", "workflow", "tdd", "code_mode"])
export type AgentMode = z.infer<typeof AgentMode>

export const ChatRole = z.enum(["user", "assistant", "system"])
export type ChatRole = z.infer<typeof ChatRole>

export const ChatMessage = z.object({
  id: z.string().optional(),
  role: ChatRole,
  content: z.string(),
  /** DeepSeek V4 带 tools 时必须回传上一轮思考 */
  reasoning: z.string().optional()
})
export type ChatMessage = z.infer<typeof ChatMessage>

export const RunAgentInput = z.object({
  sessionId: z.string(),
  workspaceId: z.string(),
  modelId: z.string(),
  mode: AgentMode.default("agent"),
  reasoningEffort: ReasoningEffortSchema.optional(),
  messages: z.array(ChatMessage),
  attachments: z.array(z.string()).default([]),
  /** false 时不把最后一条用户句落库。续跑 Todo 用，避免刷新后多出气泡。 */
  persistUser: z.boolean().optional()
})
export type RunAgentInput = z.infer<typeof RunAgentInput>

export const AbortAgentInput = z.object({
  runId: z.string()
})
export type AbortAgentInput = z.infer<typeof AbortAgentInput>
