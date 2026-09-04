/**
 * 企业账单页：Hero、支付、指标、发票，以及对比 / 升级弹窗。
 * 数据为本地演示草稿，未接计费后端。
 */
import { useState } from "react"
import {
  BillingInvoicesCard,
  BillingPaymentCard,
  BillingPlanHero,
  BillingStatCards,
  DEFAULT_BILLING_PLAN,
  DEFAULT_BILLING_STATS,
  DEFAULT_INVOICES,
  DEFAULT_PAYMENT_METHOD,
  PaymentEditDialog,
  PricingComparisonDialog,
  PricingUpgradeDialog,
  type BillingInvoice,
  type BillingPlanInfo,
  type PaymentMethodInfo
} from "./billing"
import { BILLING_EYEBROW_CLASS } from "./billing/billing.constants"
import { tierIdFromPlanName } from "./billing/lib/apply-upgrade"

export function CompanyBillingSection() {
  const [plan, setPlan] = useState<BillingPlanInfo>(DEFAULT_BILLING_PLAN)
  const [payment, setPayment] = useState<PaymentMethodInfo>(DEFAULT_PAYMENT_METHOD)
  const [stats] = useState(DEFAULT_BILLING_STATS)
  const [invoices] = useState<BillingInvoice[]>(DEFAULT_INVOICES)
  const [compareOpen, setCompareOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [upgradeTierId, setUpgradeTierId] = useState("enterprise")

  function handleCancelPlan() {
    setPlan((prev) => ({
      ...prev,
      status: "canceled",
      statusLabel: "Canceled · expires May 14, 2027"
    }))
  }

  function handleSelectFromComparison(planId: string) {
    setCompareOpen(false)
    if (planId === "custom") return
    setUpgradeTierId(planId)
    setUpgradeOpen(true)
  }

  function handleUpgradeClick() {
    setUpgradeTierId(tierIdFromPlanName(plan.name))
    setUpgradeOpen(true)
  }

  return (
    <div className="flex max-w-4xl flex-col gap-5 pb-8 select-none">
      <div className="flex flex-col gap-1">
        <span className={BILLING_EYEBROW_CLASS}>Settings · Billing · 本地演示</span>
        <h1 className="text-title-1-semibold text-text-primary">账单</h1>
        <p className="text-caption-1-medium text-text-tertiary">
          Plan, payment method, and invoice history. 未接计费后端，改动只留在本页。
        </p>
      </div>

      <BillingPlanHero
        plan={plan}
        onComparePlans={() => setCompareOpen(true)}
        onCancelPlan={handleCancelPlan}
        onUpgrade={handleUpgradeClick}
      />
      <BillingPaymentCard payment={payment} onUpdate={() => setPaymentOpen(true)} />
      <BillingStatCards stats={stats} />
      <BillingInvoicesCard invoices={invoices} />

      <PricingComparisonDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        currentPlanName={plan.name}
        onSelectPlan={handleSelectFromComparison}
      />
      <PricingUpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentPlan={plan}
        initialTierId={upgradeTierId}
        onApplyUpgrade={setPlan}
      />
      <PaymentEditDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        payment={payment}
        onSave={(next) => {
          setPayment(next)
          setPaymentOpen(false)
        }}
      />
    </div>
  )
}
