/**
 * 方案对比弹窗：横向矩阵，Custom 不进入升级滑块。
 */
import { Fragment } from "react"
import { RiCheckLine, RiSubtractLine } from "@remixicon/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { BILLING_EYEBROW_CLASS, COMPARISON_PLAN_COLUMNS, COMPARISON_SECTIONS } from "../billing.constants"

interface PricingComparisonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlanName?: string
  onSelectPlan?: (planId: string) => void
}

export function PricingComparisonDialog({
  open,
  onOpenChange,
  currentPlanName,
  onSelectPlan
}: PricingComparisonDialogProps) {
  function handleChoose(planId: string) {
    onSelectPlan?.(planId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-5xl overflow-hidden border border-separator-border bg-background-primary-default p-0 shadow-card sm:max-w-5xl sm:rounded-2xl select-none">
        <DialogHeader className="border-b border-separator-border/60 px-6 pt-6 pb-4">
          <span className={BILLING_EYEBROW_CLASS}>Settings · Compare plans</span>
          <DialogTitle className="mt-1 text-title-2-semibold text-text-primary">
            全量方案规格与特性横向对比
          </DialogTitle>
          <DialogDescription className="mt-0.5 text-caption-1-medium text-text-tertiary">
            横向评估 Starter、Pro 与 Enterprise 在智能体执行、并发吞吐与企业级治理能力的差异。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[68vh] overflow-x-auto overflow-y-auto px-6 py-4">
          <div className="min-w-[620px] overflow-hidden rounded-xl border border-separator-border/70">
            <table className="w-full border-collapse text-left text-caption-1-medium">
              <thead>
                <tr className="border-b border-separator-border/60 bg-background-secondary-default/40">
                  <th className={cx("w-[30%] px-4 py-3.5", BILLING_EYEBROW_CLASS)}>Plan</th>
                  {COMPARISON_PLAN_COLUMNS.map((col) => (
                    <ComparisonHead
                      key={col.id}
                      name={col.name}
                      price={col.price}
                      cadence={col.cadence}
                      highlight={col.highlight}
                      current={Boolean(currentPlanName?.toLowerCase().includes(col.name.toLowerCase()))}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_SECTIONS.map((section) => (
                  <Fragment key={section.title}>
                    <tr>
                      <td
                        colSpan={5}
                        className="border-y border-separator-border/50 bg-background-secondary-default/50 px-4 py-2 font-mono text-caption-2-medium uppercase text-text-secondary"
                      >
                        {section.title}
                      </td>
                    </tr>
                    {section.rows.map((row) => (
                      <tr
                        key={row.label}
                        className="border-b border-separator-border/40 hover:bg-background-secondary-hover/30"
                      >
                        <td className="px-4 py-2.5 text-text-secondary">{row.label}</td>
                        {row.values.map((val, idx) => (
                          <td
                            key={`${row.label}-${idx}`}
                            className={cx(
                              "px-4 py-2.5",
                              COMPARISON_PLAN_COLUMNS[idx]?.highlight && "bg-accent-500/5"
                            )}
                          >
                            {typeof val === "boolean" ? (
                              val ? (
                                <RiCheckLine className="size-4 text-state-success-text" />
                              ) : (
                                <RiSubtractLine className="size-4 text-text-tertiary/35" />
                              )
                            ) : (
                              <span className="font-mono text-caption-2-medium text-text-primary">{val}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
                <tr className="bg-background-secondary-default/30">
                  <td className="px-4 py-3 text-caption-2-medium text-text-tertiary">
                    灵活升降配 · 差额自动按天折算
                  </td>
                  {COMPARISON_PLAN_COLUMNS.map((col) => {
                    const isCurrent = Boolean(
                      currentPlanName?.toLowerCase().includes(col.name.toLowerCase())
                    )
                    return (
                      <td key={col.id} className="px-4 py-3">
                        <Button
                          size="sm"
                          type="button"
                          variant={col.highlight ? "default" : "outline"}
                          disabled={isCurrent}
                          onClick={() => handleChoose(col.id)}
                          className={cx(
                            "h-8 w-full text-caption-2-medium",
                            col.highlight && "bg-accent-500 text-text-white hover:bg-accent-600"
                          )}
                        >
                          {isCurrent
                            ? "当前生效"
                            : col.id === "starter"
                              ? "降级轻量"
                              : col.id === "custom"
                                ? "关闭"
                                : "立即升级"}
                        </Button>
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ComparisonHead({
  name,
  price,
  cadence,
  highlight,
  current
}: {
  name: string
  price: string
  cadence: string
  highlight?: boolean
  current: boolean
}) {
  return (
    <th className={cx("px-4 py-3.5", highlight && "bg-accent-500/5")}>
      <div className="flex items-center gap-1.5">
        <span className="text-body-medium text-text-primary">{name}</span>
        {current ? (
          <span className="rounded bg-accent-500/10 px-1 font-mono text-caption-2-medium text-accent-500">
            当前
          </span>
        ) : null}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-mono text-title-3-semibold text-text-primary">{price}</span>
        <span className="font-mono text-caption-2-medium text-text-tertiary">{cadence}</span>
      </div>
    </th>
  )
}
