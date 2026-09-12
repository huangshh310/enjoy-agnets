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
    return `${t("settings.agentTools.officialLogin")} · ${officialStatusText(parts.official, t)}`
  }
  const provider = parts.archive || "—"
  const model = parts.model || "—"
  if (parts.mode === "omp") {
    return t("settings.agentTools.ompSummary", { provider, model })
  }
  return t("settings.agentTools.boundSummary", { provider, model })
}

function officialStatusText(
  official: PowerSourceParts["official"],
  t: Translate
): string {
  if (official === "in") return t("settings.agentTools.accountSignedIn")
  if (official === "check") return t("settings.agentTools.listOfficialCheck")
  if (official === "auth") return t("settings.agentTools.listOfficialAuth")
  if (official === "fail") return t("settings.agentTools.listOfficialFail")
  return t("settings.agentTools.listOfficialOut")
}
