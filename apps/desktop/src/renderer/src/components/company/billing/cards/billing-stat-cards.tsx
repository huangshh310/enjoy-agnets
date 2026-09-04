/**
 * Credits / Tax ID / Currency 三列指标。
 */
import { RiCoinsLine, RiFileTextLine, RiGlobalLine } from "@remixicon/react"
import { BILLING_EYEBROW_CLASS } from "../billing.constants"
import type { BillingStatItem } from "../billing.types"

interface BillingStatCardsProps {
  stats: BillingStatItem[]
}

const STAT_ICON = {
  credits: RiCoinsLine,
  tax: RiFileTextLine,
  currency: RiGlobalLine
} as const

export function BillingStatCards({ stats }: BillingStatCardsProps) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((item) => {
        const Icon = STAT_ICON[item.icon]
        return (
          <div
            key={item.id}
            className="flex flex-col justify-between rounded-2xl border border-separator-border/80 bg-background-primary-default p-4 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className={BILLING_EYEBROW_CLASS}>{item.label}</span>
              <Icon className="size-4 text-foreground-icon-tertiary opacity-50" />
            </div>
            <div className="mt-2.5 font-mono text-title-2-semibold text-text-primary">{item.value}</div>
            <div className="mt-1 text-caption-2-medium text-text-tertiary">{item.caption}</div>
          </div>
        )
      })}
    </section>
  )
}
