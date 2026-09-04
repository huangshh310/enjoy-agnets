/**
 * 升级确认：把选中档位与席位折成账单页 plan，Starter 不用滑块残留席位。
 */
import type { BillingPlanInfo, UpgradeTierPlan } from "../billing.types"

export function tokenQuotaForTier(tierId: string): string {
  if (tierId === "starter") return "100k"
  if (tierId === "pro") return "5M"
  return "50M"
}

export function tierIdFromPlanName(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes("starter")) return "starter"
  if (lower.includes("enterprise") || lower.includes("team")) return "enterprise"
  if (lower.includes("pro")) return "pro"
  return "enterprise"
}

export function applyUpgradePlan(
  current: BillingPlanInfo,
  tier: UpgradeTierPlan,
  seats: number,
  annual: boolean
): BillingPlanInfo {
  const seatCount = tier.id === "starter" ? 5 : seats
  const perSeat = annual ? tier.yearlyPricePerSeat : tier.monthlyPricePerSeat
  const monthlyTotal = tier.id === "starter" ? 0 : seatCount * perSeat
  return {
    ...current,
    name: tier.name,
    tierBadge: annual ? "Annual" : "Monthly",
    priceMonthly: monthlyTotal,
    seatsTotal: seatCount,
    seatsUsed: Math.min(current.seatsUsed, seatCount),
    description: `${seatCount} 席位 · 无限制智能体项目 · ${tokenQuotaForTier(tier.id)} API Token 吞吐`,
    status: "active",
    statusLabel: `Active · renews ${annual ? "May 14, 2027" : "Oct 14, 2026"}`
  }
}
