/**
 * 预设里已经写明的控制台地址。只认预设字段，不猜、不用 docsURL；只放行 https（交给系统浏览器的外链不降级到明文）。
 */
import { presetFor } from "@enjoy-agents/providers/presets"

/** 只放行 https；http: / javascript: / file: / 解析失败一律 undefined。 */
export function safeHttpsUrl(url: string | undefined): string | undefined {
  const trimmed = url?.trim()
  if (!trimmed) return undefined
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== "https:") return undefined
    return parsed.toString()
  } catch {
    return undefined
  }
}

/** 充值页：billingURL 优先，否则 keysURL；不安全的一条跳过，都没有返回 undefined（只显示文案，不给按钮）。 */
export function billingUrlOf(preset: { billingURL?: string; keysURL?: string }): string | undefined {
  return safeHttpsUrl(preset.billingURL) ?? safeHttpsUrl(preset.keysURL)
}

export function presetBillingUrl(kind: string | undefined): string | undefined {
  if (!kind?.trim()) return undefined
  return billingUrlOf(presetFor(kind))
}
