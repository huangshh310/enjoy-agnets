/**
 * COST-P3：costStatus → 可见铬条文案（LUNA 锁）。
 * 未知禁止 $0.00；not_reported 不留花费位。
 */
import type {
  CostMissingItem,
  CostSource,
  EstimatedCost,
  SessionEstimatedCost
} from "@enjoy-agents/ipc-contract/estimated-cost"

type Translate = (path: string, vars?: Record<string, string | number>) => string

export type CostChrome = {
  /** 主文案；null = 不画花费位（not_reported / 无 status） */
  text: string | null
  /** 「估算」前缀，仅 estimated */
  prefix?: string
  title: string
}

export function formatUsdAmount(usd: number): string {
  if (!Number.isFinite(usd)) return "—"
  if (usd > 0 && usd < 0.01) return "<$0.01"
  return `$${usd.toFixed(2)}`
}

export function formatEstimatedCost(
  cost: EstimatedCost | null | undefined,
  t: Translate,
  opts?: { engineLabel?: string }
): CostChrome {
  if (!cost?.status || cost.status === "not_reported") {
    return { text: null, title: "" }
  }
  if (cost.status === "local_unbilled") {
    return {
      text: t("chat.usage.costLocalUnbilled"),
      title: t("chat.usage.costLocalUnbilledHint")
    }
  }
  if (cost.status === "reported") {
    const amount = typeof cost.usd === "number" ? formatUsdAmount(cost.usd) : "—"
    const engine = (opts?.engineLabel ?? "").trim() || t("chat.usage.costEngineFallback")
    return {
      text: t("chat.usage.costReported", { amount, engine }),
      title: t("chat.usage.costReportedHint", { engine })
    }
  }
  if (cost.status === "unknown") {
    return {
      text: "—",
      title: unknownTitle(cost.missing, t)
    }
  }
  const amount = typeof cost.usd === "number" ? formatUsdAmount(cost.usd) : "—"
  return {
    text: amount,
    prefix: t("chat.usage.costEstimatePrefix"),
    title: estimatedTitle(cost, t)
  }
}

export function formatSessionCostHover(
  sum: SessionEstimatedCost | null | undefined,
  t: Translate
): string {
  if (!sum) return t("chat.usage.sessionMeterHint")
  const lines: string[] = []
  const hasKnown = typeof sum.knownUsd === "number"
  const unknown = sum.unknownCount ?? 0
  if (hasKnown && unknown > 0) {
    lines.push(
      t("chat.usage.sessionCostKnownPartial", {
        amount: formatUsdAmount(sum.knownUsd as number),
        n: unknown
      })
    )
    lines.push(
      t("chat.usage.sessionCostPartialHint", {
        known: Math.max(0, (sum.runs?.length ?? 0) - unknown),
        n: unknown
      })
    )
  } else if (hasKnown) {
    lines.push(
      t("chat.usage.sessionCostKnown", {
        amount: formatUsdAmount(sum.knownUsd as number)
      })
    )
  } else if (unknown > 0) {
    lines.push(t("chat.usage.sessionCostAllUnknown", { n: unknown }))
  }
  if (typeof sum.reportedUsd === "number") {
    lines.push(t("chat.usage.sessionCostReported", { amount: formatUsdAmount(sum.reportedUsd) }))
  }
  if (lines.length === 0) {
    const onlyLocal = (sum.runs ?? []).some((r) => r.status === "local_unbilled")
    if (onlyLocal) return t("chat.usage.costLocalUnbilledHint")
    return t("chat.usage.sessionMeterHint")
  }
  lines.push(t("chat.usage.costNotBillFootnote"))
  return lines.join("\n")
}

function estimatedTitle(cost: EstimatedCost, t: Translate): string {
  const source = cost.source as CostSource | undefined
  if (source === "user") {
    return joinTitle(t("chat.usage.costSourceUser"), t("chat.usage.costNotBillFootnote"))
  }
  if (source === "snapshot" || source === "mixed") {
    const date = cost.snapshotDate?.trim()
    const snap = date
      ? t("chat.usage.costSourceSnapshotDated", { date })
      : t("chat.usage.costSourceSnapshot")
    return joinTitle(snap, t("chat.usage.costNotBillFootnote"))
  }
  return t("chat.usage.costNotBillFootnote")
}

function unknownTitle(missing: CostMissingItem[] | undefined, t: Translate): string {
  const items = missing ?? []
  if (items.includes("tier")) {
    return joinTitle(t("chat.usage.costUnknownTier"), t("chat.usage.costNotBillFootnote"))
  }
  const itemLabels: CostMissingItem[] = ["cacheWrite", "cacheRead", "input", "output", "reasoning"]
  const priced = itemLabels.filter((m) => items.includes(m))
  if (priced.length > 0) {
    const label = priced.map((m) => missingItemLabel(m, t)).join(" / ")
    return joinTitle(t("chat.usage.costUnknownMissing", { item: label }), t("chat.usage.costNotBillFootnote"))
  }
  if (items.includes("usage")) {
    return joinTitle(t("chat.usage.costUnknownUsage"), t("chat.usage.costNotBillFootnote"))
  }
  return joinTitle(t("chat.usage.costUnknownPrice"), t("chat.usage.costNotBillFootnote"))
}

function missingItemLabel(item: CostMissingItem, t: Translate): string {
  switch (item) {
    case "input":
      return t("chat.usage.costMissingInput")
    case "output":
      return t("chat.usage.costMissingOutput")
    case "cacheRead":
      return t("chat.usage.costMissingCacheRead")
    case "cacheWrite":
      return t("chat.usage.costMissingCacheWrite")
    case "reasoning":
      return t("chat.usage.costMissingReasoning")
    default:
      return item
  }
}

function joinTitle(...parts: string[]): string {
  return parts.filter(Boolean).join("\n")
}
