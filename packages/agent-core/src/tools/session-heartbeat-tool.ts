// @ts-nocheck — Zod 4 object schemas are runtime-valid with AI SDK 7.
/**
 * 让当前会话的助手保存一条本机心跳。执行前必须等人审批。
 */
import { tool } from "ai"
import { z } from "zod"
import type { SaveSessionHeartbeat } from "../runtime-context.ts"
import { SET_SESSION_HEARTBEAT_TOOL } from "./session-heartbeat-name"

export function createSessionHeartbeatTool(sessionId: string, save?: SaveSessionHeartbeat) {
  return {
    [SET_SESSION_HEARTBEAT_TOOL]: tool({
      description:
        "Save a local heartbeat that sends a prompt back into this same session on a cadence such as 15m, 1h, or a five-field cron. Requires user approval. Does not create another session.",
      inputSchema: z.object({
        cadence: z.string().min(1).max(80),
        prompt: z.string().min(1).max(4000),
        maxRuns: z.number().int().positive().max(1000).optional()
      }),
      execute: async ({ cadence, prompt, maxRuns }) => {
        if (!save) return { ok: false, error: "This session cannot save a heartbeat." }
        return save({ sessionId, cadence, prompt, maxRuns: maxRuns ?? null })
      }
    })
  }
}
