/**
 * 升级弹窗壳：组合档位、月年切换与席位滑块。
 */
import { useEffect, useState } from "react"
import { RiCheckLine } from "@remixicon/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { BILLING_EYEBROW_CLASS, UPGRADE_TIER_PLANS } from "../billing.constants"
import { applyUpgradePlan } from "../lib/apply-upgrade"
import type { BillingPlanInfo } from "../billing.types"
import { UpgradeCadenceToggle } from "./upgrade-cadence-toggle"
import { UpgradeSeatSlider } from "./upgrade-seat-slider"
import { UpgradeTierCards } from "./upgrade-tier-cards"

interface PricingUpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: BillingPlanInfo
  initialTierId: string
  onApplyUpgrade: (newPlan: BillingPlanInfo) => void
}

export function PricingUpgradeDialog({
  open,
  onOpenChange,
  currentPlan,
  initialTierId,
  onApplyUpgrade
}: PricingUpgradeDialogProps) {
  const [annual, setAnnual] = useState(true)
  const [selectedTierId, setSelectedTierId] = useState(initialTierId)
  const [seats, setSeats] = useState(currentPlan.seatsTotal || 10)

  useEffect(() => {
    if (!open) return
    setSelectedTierId(initialTierId)
    setSeats(currentPlan.seatsTotal || 10)
  }, [open, initialTierId, currentPlan.seatsTotal])

  const selectedTier =
    UPGRADE_TIER_PLANS.find((tier) => tier.id === selectedTierId) ?? UPGRADE_TIER_PLANS[1]!
  const perSeatPrice = annual ? selectedTier.yearlyPricePerSeat : selectedTier.monthlyPricePerSeat
  const monthlyTotal = selectedTier.id === "starter" ? 0 : seats * perSeatPrice
  const yearlyTotal = annual ? monthlyTotal * 12 : null

  function handleConfirm() {
    onApplyUpgrade(applyUpgradePlan(currentPlan, selectedTier, seats, annual))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl overflow-hidden border border-separator-border bg-background-primary-default p-0 shadow-card sm:max-w-4xl sm:rounded-2xl select-none">
        <DialogHeader className="border-b border-separator-border/60 px-6 pt-6 pb-4">
          <div className="flex flex-col justify-between gap-4 pr-10 sm:flex-row sm:items-center">
            <div>
              <span className={BILLING_EYEBROW_CLASS}>Settings · Upgrade</span>
              <DialogTitle className="mt-1 text-title-2-semibold text-text-primary">
                升级与配置订阅方案
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-caption-1-medium text-text-tertiary">
                实时调整团队规模与席位，差额按天计算；随时可升降配。
              </DialogDescription>
            </div>
            <UpgradeCadenceToggle annual={annual} onChange={setAnnual} />
          </div>
        </DialogHeader>

        <div className="flex max-h-[72vh] flex-col gap-6 overflow-y-auto px-6 py-5">
          <UpgradeTierCards
            tiers={UPGRADE_TIER_PLANS}
            selectedTierId={selectedTierId}
            annual={annual}
            onSelect={setSelectedTierId}
          />
          {selectedTier.id !== "starter" ? (
            <UpgradeSeatSlider
              planName={selectedTier.name}
              seats={seats}
              perSeatPrice={perSeatPrice}
              monthlyTotal={monthlyTotal}
              yearlyTotal={yearlyTotal}
              onSeatsChange={setSeats}
            />
          ) : null}
        </div>

        <DialogFooter className="flex flex-col items-center justify-between gap-3 border-t border-separator-border/60 bg-background-secondary-default/30 px-6 py-4 sm:flex-row">
          <div className="text-center font-mono text-caption-1-medium text-text-tertiary sm:text-left">
            当前选配: <strong className="text-text-primary">{selectedTier.name}</strong> ·{" "}
            {selectedTier.id === "starter" ? "永久免费" : `${seats} 席位 / $${monthlyTotal} 每月`}
          </div>
          <div className="flex w-full items-center justify-end gap-2.5 sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              className="gap-1.5 bg-accent-500 px-4 text-caption-1-medium text-text-white shadow-sm hover:bg-accent-600"
            >
              <RiCheckLine className="size-4" />
              <span>确认变更订阅</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
