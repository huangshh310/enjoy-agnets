/**
 * 本机个人资料：走 preferences，不是云账号，也不是 renderer 私货。
 */
import { z } from "zod"

export const AccountCoverPreset = z.enum(["glyph-rain", "hex-float", "retro-dither", "frost"])

export const AccountBlobatarPref = z.object({
  name: z.string(),
  expression: z.string().optional(),
  hue: z.number().optional(),
  tone: z.number().optional(),
  background: z.string().optional(),
  animate: z.string().optional()
})

export const AccountProfilePref = z.object({
  name: z.string(),
  handle: z.string(),
  email: z.string(),
  roleTitle: z.string(),
  coverPreset: AccountCoverPreset,
  blobatar: AccountBlobatarPref.optional()
})

export type AccountProfilePref = z.infer<typeof AccountProfilePref>
