/**
 * 推理强度：UI、IPC 与 Agent 共用，避免各处手写字面量。
 */
import { z } from "zod"

export const ReasoningEffort = z.enum(["low", "medium", "high", "xhigh"])
export type ReasoningEffort = z.infer<typeof ReasoningEffort>
