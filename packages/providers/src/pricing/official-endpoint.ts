/**
 * 官方默认端点才套快照价；中转 / 自定义没填用户单价就是未知。
 */
import { officialSiblingEndpoints, presetFor, normalizeBaseURL } from "../presets.ts"
import { isProviderKind } from "../presets/kinds.ts"
import { userRatesToModelRate } from "./user-rates.ts"
import type { UserModelRates } from "./types.ts"

export function hasUserRates(user?: UserModelRates): boolean {
  return Object.values(userRatesToModelRate(user)).some((value) => value !== undefined)
}

export function isOfficialProviderEndpoint(kind: string, baseURL?: string): boolean {
  if (!kind || kind === "custom" || !isProviderKind(kind)) return false
  const preset = presetFor(kind)
  const url = baseURL?.trim()
  if (!url) return true
  if (officialSiblingEndpoints(preset, url)) return true
  return normalizeBaseURL(url) === normalizeBaseURL(preset.defaultBaseURL)
}
