/**
 * 升级弹窗三档套餐卡片。
 */
import { RiCheckLine, RiSparklingLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { BILLING_EYEBROW_CLASS } from "../billing.constants"
import type { UpgradeTierPlan } from "../billing.types"

interface UpgradeTierCardsProps {
  tiers: UpgradeTierPlan[]
  selectedTierId: string
  annual: boolean
  onSelect: (tierId: string) => void
}

export function UpgradeTierCards({
  tiers,
  selectedTierId,
  annual,
  onSelect
}: UpgradeTierCardsProps) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-3">
      {tiers.map((tier) => (
        <UpgradeTierCard
          key={tier.id}
          tier={tier}
          selected={selectedTierId === tier.id}
          annual={annual}
          onSelect={() => onSelect(tier.id)}
        />
      ))}
    </div>
  )
}

function UpgradeTierCard({
  tier,
  selected,
  annual,
  onSelect
}: {
  tier: UpgradeTierPlan
  selected: boolean
  annual: boolean
  onSelect: () => void
}) {
  const displayPrice = annual ? tier.yearlyPricePerSeat : tier.monthlyPricePerSeat
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx(
        "relative flex cursor-pointer flex-col justify-between rounded-2xl p-5 text-left transition-all",
        selected
          ? "border-2 border-accent-500 bg-accent-500/5 shadow-md"
          : "border border-separator-border/70 bg-background-secondary-default/30 hover:bg-background-secondary-hover/50"
      )}
    >
      {tier.badge ? (
        <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-accent-500 px-2.5 py-0.5 font-mono text-caption-2-medium text-text-white shadow-xs">
          <RiSparklingLine className="size-3" />
          {tier.badge}
        </span>
      ) : null}
      <div>
        <span className={BILLING_EYEBROW_CLASS}>{tier.name}</span>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-mono text-title-1-semibold text-text-primary">${displayPrice}</span>
          <span className="text-caption-2-medium text-text-tertiary">
            {displayPrice === 0 ? "永久免费" : "/席位 /月"}
          </span>
        </div>
        {annual && displayPrice > 0 ? (
          <div className="mt-1 font-mono text-caption-2-medium text-text-tertiary">
            原价 <span className="line-through opacity-60">${tier.monthlyPricePerSeat}</span> · 按年计费
          </div>
        ) : null}
        <p className="mt-2.5 text-caption-2-medium leading-normal text-text-secondary">{tier.blurb}</p>
      </div>
      <ul className="mt-5 flex flex-1 flex-col gap-2.5 border-t border-separator-border/50 pt-4">
        {tier.features.map((feat) => (
          <li key={feat} className="flex items-start gap-2 text-caption-1-medium text-text-secondary">
            <RiCheckLine className="mt-0.5 size-4 shrink-0 text-state-success-text" />
            <span className="leading-snug">{feat}</span>
          </li>
        ))}
      </ul>
    </button>
  )
}
