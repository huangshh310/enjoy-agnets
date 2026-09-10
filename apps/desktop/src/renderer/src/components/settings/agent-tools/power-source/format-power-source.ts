/**
 * 把动力源 parts 翻成列表胶囊文案。禁止协议微标。
 */
import type { PowerSourceParts } from "@enjoy-agents/ipc-contract"

type Translate = (key: string, vars?: Record<string, string | number>) => string

/** 列表「动力源」列永远有非空正文。 */
export function formatPowerSourceText(parts: PowerSourceParts, t: Translate): string {
  if (parts.mode === "official") {
    const status =
      parts.official === "in"
        ? t("settings.agentTools.accountSignedIn")
        : parts.official === "check"
          ? t("settings.agentTools.accountChecking")
          : t("settings.agentTools.accountNeedsLogin")
    return `${t("settings.agentTools.officialLogin")} · ${status}`
  }
  const provider = parts.archive || "—"
  const model = parts.model || "—"
  if (parts.mode === "omp") {
    return t("settings.agentTools.ompSummary", { provider, model })
  }
  return t("settings.agentTools.boundSummary", { provider, model })
}
