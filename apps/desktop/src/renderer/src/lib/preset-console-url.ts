/**
 * 预设里已经写明的控制台地址。只认 keysURL，不猜、不用 docsURL。
 */
import { presetFor } from "@enjoy-agents/providers/presets"

export function presetConsoleUrl(kind: string | undefined): string | undefined {
  if (!kind?.trim()) return undefined
  const url = presetFor(kind).keysURL?.trim()
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined
    return parsed.toString()
  } catch {
    return undefined
  }
}
