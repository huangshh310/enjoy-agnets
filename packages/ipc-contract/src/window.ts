/**
 * 窗口控制相关 IPC 合约：最小化、最大化切换、关闭及窗口状态
 */
import { z } from "zod";

export const WindowState = z.object({
  isMaximized: z.boolean()
});
export type WindowState = z.infer<typeof WindowState>;

export const WindowActionResult = z.object({
  ok: z.boolean()
});
export type WindowActionResult = z.infer<typeof WindowActionResult>;

/** 空闲或用户确认后放行退出；无字段。 */
export const WindowForceQuitInput = z.object({}).strict();
export type WindowForceQuitInput = z.infer<typeof WindowForceQuitInput>;
