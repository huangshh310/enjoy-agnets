/**
 * 支付方式卡片：Visa、脱敏卡号、有效期、邮箱、Default；Update 交给父级改本地草稿。
 */
import { RiBankCardLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import type { PaymentMethodInfo } from "../billing.types"

interface BillingPaymentCardProps {
  payment: PaymentMethodInfo
  onUpdate: () => void
}

export function BillingPaymentCard({ payment, onUpdate }: BillingPaymentCardProps) {
  return (
    <section className="rounded-2xl border border-separator-border/80 bg-background-primary-default p-6 shadow-2xs">
      <header className="flex items-center justify-between">
        <h2 className="text-title-3-semibold text-text-primary">Payment method</h2>
        <Button
          size="sm"
          variant="ghost"
          onClick={onUpdate}
          className="text-caption-1-medium text-text-secondary hover:text-text-primary"
        >
          Update
        </Button>
      </header>

      <div className="mt-4 flex items-center gap-4 rounded-xl border border-separator-border/60 bg-background-secondary-default/40 p-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-text-primary text-background-primary-default shadow-xs">
          <RiBankCardLine className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-body-medium text-text-primary">{payment.brand}</span>
            <span className="font-mono text-caption-1-medium text-text-secondary">
              •••• {payment.last4}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-caption-2-medium text-text-tertiary">
            Expires {payment.expiry} · {payment.billingEmail}
          </p>
        </div>
        {payment.isDefault ? (
          <span className="rounded border border-separator-border/70 bg-background-secondary-default px-2 py-1 font-mono text-caption-2-medium uppercase text-text-secondary">
            Default
          </span>
        ) : null}
      </div>
    </section>
  )
}
