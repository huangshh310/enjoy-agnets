/**
 * 升级弹窗月付 / 年付胶囊。
 */
import { cx } from "@/utils/cx"

interface UpgradeCadenceToggleProps {
  annual: boolean
  onChange: (annual: boolean) => void
}

export function UpgradeCadenceToggle({ annual, onChange }: UpgradeCadenceToggleProps) {
  return (
    <div className="inline-flex shrink-0 items-center self-start rounded-full border border-separator-border/70 bg-background-secondary-default/50 p-1 font-mono text-caption-2-medium sm:self-auto">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cx(
          "cursor-pointer rounded-full px-3.5 py-1 transition-all",
          !annual
            ? "bg-background-primary-default text-text-primary shadow-2xs"
            : "text-text-tertiary hover:text-text-primary"
        )}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cx(
          "flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1 transition-all",
          annual
            ? "bg-background-primary-default text-text-primary shadow-2xs"
            : "text-text-tertiary hover:text-text-primary"
        )}
      >
        <span>Yearly</span>
        <span className="rounded bg-state-success-text/15 px-1.5 font-mono text-caption-2-medium text-state-success-text">
          省 20%
        </span>
      </button>
    </div>
  )
}
