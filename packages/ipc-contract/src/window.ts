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

/** 任务栏标签最长 80，换行去掉。空串由 main 恢复品牌标题。 */
export const TASKBAR_LABEL_MAX = 80;

export const WindowSetTaskbarTitleInput = z
  .object({
    label: z.string()
  })
  .strict()
  .transform((input) => ({
    label: input.label.replace(/[\r\n]+/g, " ").trim().slice(0, TASKBAR_LABEL_MAX)
  }));
export type WindowSetTaskbarTitleInput = z.infer<typeof WindowSetTaskbarTitleInput>;

/** 终端链接等：只收 http(s)，协议在 main 再验一遍。 */
export const WindowOpenExternalInput = z
  .object({
    url: z.string().trim().min(1).max(2048)
  })
  .strict();
export type WindowOpenExternalInput = z.infer<typeof WindowOpenExternalInput>;
