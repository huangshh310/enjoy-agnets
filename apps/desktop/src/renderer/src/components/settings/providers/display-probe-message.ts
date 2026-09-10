/**
 * 探测回执：优先用 code 出中英界面文案，缺键才回落 main 原文。
 */
import type { TranslateFn } from "@renderer/i18n"

export function displayProbeMessage(
  probe: { message: string; code?: string; vars?: Record<string, string> },
  t: TranslateFn
): string {
  if (!probe.code) return probe.message
  const path = `settings.providers.${probe.code}`
  const text = t(path, probe.vars)
  return text === path ? probe.message : text
}
