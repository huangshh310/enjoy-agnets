/**
 * CU-P1-B：Composer 提及本机应用列表。
 * 与 desktop_list_apps 同源。pid 不是键；无稳 appKey 仍可出现。
 */
import { z } from "zod"

export const DesktopMentionAppKeySource = z.enum(["bundleId", "exe", "aumid", "appName"])
export type DesktopMentionAppKeySource = z.infer<typeof DesktopMentionAppKeySource>

export const DesktopMentionApp = z.object({
  displayName: z.string(),
  /** 稳键才有值；pid 不得写入。 */
  appKey: z.string(),
  appKeySource: DesktopMentionAppKeySource.optional(),
  stable: z.boolean(),
  /** 仅展示。禁止当 Always-allow / 会话键。 */
  pid: z.number().int().positive().optional()
})
export type DesktopMentionApp = z.infer<typeof DesktopMentionApp>

export const DesktopMentionAppsResult = z.object({
  ok: z.boolean(),
  apps: z.array(DesktopMentionApp),
  code: z.string().optional()
})
export type DesktopMentionAppsResult = z.infer<typeof DesktopMentionAppsResult>
