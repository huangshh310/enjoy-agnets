/**
 * 工作区终端会话的 IPC 合同：开壳、写入、关闭。
 */
import { z } from "zod"

export const TerminalOpenInput = z.object({
  workspaceId: z.string()
})
export type TerminalOpenInput = z.infer<typeof TerminalOpenInput>

export const TerminalWriteInput = z.object({
  sessionId: z.string(),
  data: z.string()
})
export type TerminalWriteInput = z.infer<typeof TerminalWriteInput>

export const TerminalCloseInput = z.object({
  sessionId: z.string()
})
export type TerminalCloseInput = z.infer<typeof TerminalCloseInput>

export const TerminalSession = z.object({
  sessionId: z.string()
})
export type TerminalSession = z.infer<typeof TerminalSession>
