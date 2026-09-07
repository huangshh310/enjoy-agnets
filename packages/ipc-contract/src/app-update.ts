/**
 * 自动更新 IPC：检查 / 下载 / 安装，以及推送给 UI 的快照。
 */
import { z } from "zod"

export const AppUpdateStatus = z.enum([
  "idle",
  "checking",
  "available",
  "downloading",
  "ready",
  "up-to-date",
  "error",
  "dev"
])
export type AppUpdateStatus = z.infer<typeof AppUpdateStatus>

export const AppUpdateSnapshot = z.object({
  status: AppUpdateStatus,
  currentVersion: z.string(),
  version: z.string().optional(),
  releaseNotes: z.string().optional(),
  percent: z.number().min(0).max(100).optional(),
  error: z.string().optional()
})
export type AppUpdateSnapshot = z.infer<typeof AppUpdateSnapshot>

export const AppUpdateActionInput = z.object({}).strict()
export type AppUpdateActionInput = z.infer<typeof AppUpdateActionInput>

/** 推送 / invoke 共用：解析失败返回 null，不要 throw 把 UI 打崩。 */
export function parseAppUpdateSnapshot(raw: unknown): AppUpdateSnapshot | null {
  const parsed = AppUpdateSnapshot.safeParse(raw)
  return parsed.success ? parsed.data : null
}
