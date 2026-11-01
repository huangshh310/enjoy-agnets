/**
 * 本轮发给模型的指令 / ModelMessage / 工具名。last-run 来自泵时快照。
 */
import { z } from "zod"
import { AgentMode } from "./chat"

/** ④ Repo map：本轮 map 占用（可选，向后兼容）。无新 StreamEvent。 */
export const RepoMapOccupancyInfo = z.object({
  mode: z.enum(["symbol", "directory"]),
  chars: z.number().int().nonnegative(),
  approxTokens: z.number().nonnegative(),
  tokenBudget: z.number().positive(),
  note: z.string().optional()
})
export type RepoMapOccupancyInfo = z.infer<typeof RepoMapOccupancyInfo>

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
  runtime: z.enum(["local", "harness", "e2e", "acp-host"]),
  instructions: z.string(),
  messages: z.array(InspectPromptMessage),
  toolNames: z.array(z.string()),
  /** 最近一次 repo_outline 占用；无则省略。 */
  repoMapOccupancy: RepoMapOccupancyInfo.optional()
})
export type InspectPromptResult = z.infer<typeof InspectPromptResult>
