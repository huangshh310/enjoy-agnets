/**
 * 账单套餐 Hero：名称、周期、权益、续费状态、月付与 Compare / Cancel / Upgrade。
 */
import { RiCheckLine, RiCloseLine, RiFlashlightLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cx } from "@/utils/cx"
import { BILLING_EYEBROW_CLASS } from "../billing.constants"
import type { BillingPlanInfo } from "../billing.types"

interface BillingPlanHeroProps {
  plan: BillingPlanInfo
  onComparePlans?: () => void
  onCancelPlan?: () => void
  onUpgrade?: () => void
}

export function BillingPlanHero({
  plan,
  onComparePlans,
  onCancelPlan,
  onUpgrade
}: BillingPlanHeroProps) {
  const canceled = plan.status === "canceled"

  return (
    <section className="overflow-hidden rounded-2xl border border-separator-border/80 bg-background-primary-default shadow-card">
      <div className="flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-title-1-semibold text-text-primary">{plan.name}</span>
            <span className="rounded border border-separator-border/70 bg-background-secondary-default px-2 py-0.5 font-mono text-caption-2-medium uppercase text-text-secondary">
              {plan.tierBadge}
            </span>
          </div>
          <p className="mt-1.5 text-caption-1-medium text-text-tertiary">{plan.description}</p>
          <div
            className={cx(
              "mt-3.5 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-caption-2-medium uppercase",
              canceled
                ? "border-separator-border bg-background-secondary-default text-text-tertiary"
                : "border-state-success-text/25 bg-state-success-text/10 text-state-success-text"
            )}
          >
            {canceled ? (
              <RiCloseLine className="size-3.5 shrink-0" />
            ) : (
              <RiCheckLine className="size-3.5 shrink-0" />
            )}
            <span>{plan.statusLabel}</span>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <div className="font-mono text-title-1-semibold text-text-primary">${plan.priceMonthly}</div>
          <div className={BILLING_EYEBROW_CLASS}>per month</div>
        </div>
      </div>

      <Separator className="bg-separator-border/60" />

      <div className="flex items-center justify-between gap-3 bg-background-secondary-default/20 p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onComparePlans}
          className="text-caption-1-medium text-text-secondary hover:text-text-primary"
        >
          Compare plans
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={canceled}
            onClick={onCancelPlan}
            className="text-caption-1-medium text-text-secondary hover:text-text-primary"
          >
            Cancel plan
          </Button>
          <Button
            size="sm"
            onClick={onUpgrade}
            className="gap-1.5 bg-accent-500 text-caption-1-medium text-text-white shadow-sm hover:bg-accent-600"
          >
            <RiFlashlightLine className="size-3.5" />
            <span>Upgrade</span>
          </Button>
        </div>
      </div>
    </section>
  )
}
