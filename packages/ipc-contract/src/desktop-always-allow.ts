/**
 * CU-P1-A 持久簿条目与撤销入参。
 * 键是稳 appKey，不是 desktop_act:* / pid。displayName 只给人看。
 */
import { z } from "zod"

export const DesktopAlwaysAllowApp = z.object({
  appKey: z.string().min(1),
  displayName: z.string().min(1)
})
export type DesktopAlwaysAllowApp = z.infer<typeof DesktopAlwaysAllowApp>

export const DesktopAlwaysAllowAppKeys = z.array(DesktopAlwaysAllowApp).default([])
export type DesktopAlwaysAllowAppKeys = z.infer<typeof DesktopAlwaysAllowAppKeys>

export const RevokeDesktopAlwaysAllowInput = z
  .object({
    appKey: z.string().min(1),
    sessionId: z.string().min(1).optional()
  })
  .strict()
export type RevokeDesktopAlwaysAllowInput = z.infer<typeof RevokeDesktopAlwaysAllowInput>
