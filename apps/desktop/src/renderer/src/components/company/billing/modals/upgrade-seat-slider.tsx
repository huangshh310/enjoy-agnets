/**
 * 升级弹窗席位滑块与快捷席位。
 */
import { cx } from "@/utils/cx"
import { BILLING_EYEBROW_CLASS } from "../billing.constants"

const SEAT_QUICK_PICKS = [5, 10, 20, 30, 50]

interface UpgradeSeatSliderProps {
  planName: string
  seats: number
  perSeatPrice: number
  monthlyTotal: number
  yearlyTotal: number | null
  onSeatsChange: (seats: number) => void
}

export function UpgradeSeatSlider({
  planName,
  seats,
  perSeatPrice,
  monthlyTotal,
  yearlyTotal,
  onSeatsChange
}: UpgradeSeatSliderProps) {
  return (
    <div className="rounded-2xl border border-separator-border/70 bg-background-secondary-default/30 p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-baseline">
        <div>
          <span className={BILLING_EYEBROW_CLASS}>{planName} · 席位规模配置</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-title-1-semibold text-text-primary">${monthlyTotal}</span>
            <span className="text-caption-1-medium text-text-tertiary">/ 每月折算</span>
          </div>
          {yearlyTotal ? (
            <p className="mt-1 font-mono text-caption-2-medium text-state-success-text">
              ${yearlyTotal.toLocaleString()} 每年总计 · 相比月付已节省 20%
            </p>
          ) : (
            <p className="mt-1 font-mono text-caption-2-medium text-text-tertiary">
              按月灵活扣缴 · 随时可增减席位
            </p>
          )}
        </div>
        <div className="inline-flex items-baseline gap-2 self-start rounded-xl border border-separator-border/70 bg-background-primary-default px-3 py-1.5 shadow-2xs sm:self-auto">
          <span className="font-mono text-title-2-semibold text-accent-500">{seats}</span>
          <span className="font-mono text-caption-2-medium text-text-tertiary">
            席位 × ${perSeatPrice}
          </span>
        </div>
      </div>

      <div className="mt-6">
        <input
          type="range"
          min={1}
          max={50}
          value={seats}
          onChange={(event) => onSeatsChange(Number(event.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-separator-border/80 accent-accent-500"
        />
        <div className="mt-2.5 flex justify-between font-mono text-caption-2-medium uppercase text-text-tertiary">
          <span>1 席</span>
          <span>10</span>
          <span>20</span>
          <span>30</span>
          <span>40</span>
          <span>50+ 席位</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-separator-border/40 pt-3.5">
        <span className="text-caption-2-medium text-text-tertiary">常用席位:</span>
        {SEAT_QUICK_PICKS.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onSeatsChange(num)}
            className={cx(
              "cursor-pointer rounded-md border px-2.5 py-1 font-mono text-caption-2-medium transition-all",
              seats === num
                ? "border-accent-500 bg-accent-500 text-text-white"
                : "border-separator-border/70 bg-background-primary-default text-text-secondary hover:bg-background-secondary-hover"
            )}
          >
            {num} 席
          </button>
        ))}
      </div>
    </div>
  )
}
