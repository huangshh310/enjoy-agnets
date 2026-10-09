/**
 * models.dev 目录的 api 主机必须和本仓 preset 是同一站点。
 * 没有 api 字段就不拦；有 api 但对不上就撤。
 */
import { presetFor } from "../presets.ts"

export function hostOf(url: string): string | undefined {
  try {
    const host = new URL(url).hostname.trim().toLowerCase()
    return host || undefined
  } catch {
    return undefined
  }
}

export function catalogApiMatchesPreset(kind: string, catalogApi?: string): boolean {
  if (!catalogApi?.trim()) return true
  const catalogHost = hostOf(catalogApi)
  if (!catalogHost) return true
  return presetHosts(kind).includes(catalogHost)
}

export function presetHosts(kind: string): string[] {
  const preset = presetFor(kind)
  const urls = [preset.defaultBaseURL, ...Object.values(preset.endpoints ?? {})]
  return [...new Set(urls.filter((url): url is string => Boolean(url)).map(hostOf).filter(Boolean))] as string[]
}
