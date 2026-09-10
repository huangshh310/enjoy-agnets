/**
 * 把动力源 parts 翻成列表胶囊文案。禁止协议微标。
 */
import type { PowerSourceParts } from "@enjoy-agents/ipc-contract"

type Translate = (key: string, vars?: Record<string, string | number>) => string

/** 空档案 / 空 OMP 不假装有 vault。 */
export function isBlankPowerSource(parts: PowerSourceParts): boolean {
  if (parts.mode === "official") return false
  return !parts.archive && !parts.model
}

/** 列表「动力源」列永远有非空正文。 */
export function formatPowerSourceText(parts: PowerSourceParts, t: Translate): string {
  if (isBlankPowerSource(parts)) return "—"
  if (parts.mode === "official") {
    const status =
      parts.official === "in"
        ? t("settings.agentTools.accountSignedIn")
        : parts.official === "check"
          ? t("settings.agentTools.listOfficialCheck")
          : t("settings.agentTools.listOfficialOut")
    return `${t("settings.agentTools.officialLogin")} · ${status}`
  }
  const provider = parts.archive || "—"
  const model = parts.model || "—"
  if (parts.mode === "omp") {
    return t("settings.agentTools.ompSummary", { provider, model })
  }
  return t("settings.agentTools.boundSummary", { provider, model })
}
