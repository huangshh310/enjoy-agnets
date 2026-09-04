/**
 * Doctor 状态诊断与一键修复面板。
 */
import { useState } from "react"
import {
  RiAlertLine,
  RiCheckDoubleLine,
  RiLoader4Line,
  RiShieldCheckLine,
  RiStethoscopeLine
} from "@remixicon/react"
import type { SkillSourceWarning } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { SKILLS_UI_COPY } from "../constants/skills-ui.constants"

export function SkillsDoctorModal({
  open,
  warnings,
  onOpenChange,
  onRepairAll
}: {
  open: boolean
  warnings: SkillSourceWarning[]
  onOpenChange: (open: boolean) => void
  onRepairAll: () => Promise<void>
}) {
  const [isRepairing, setIsRepairing] = useState(false)
  const hasIssues = warnings.length > 0

  async function handleRepair() {
    setIsRepairing(true)
    try {
      await onRepairAll()
    } finally {
      setIsRepairing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card">
        <DialogHeader>
          <div className="flex items-center gap-2 text-accent-500 mb-1">
            <RiStethoscopeLine className="size-5" />
            <DialogTitle className="text-title-3-semibold text-text-primary">
              {SKILLS_UI_COPY.doctorTitle}
            </DialogTitle>
          </div>
          <DialogDescription className="text-caption-1-regular text-text-secondary leading-relaxed">
            {SKILLS_UI_COPY.doctorDesc}
          </DialogDescription>
        </DialogHeader>

        <div className="my-3 flex flex-col gap-2.5 max-h-[350px] overflow-y-auto pr-1">
          {!hasIssues ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
                <RiCheckDoubleLine className="size-5" />
              </div>
              <h4 className="text-caption-1-medium font-semibold text-text-primary">
                {SKILLS_UI_COPY.healthyState}
              </h4>
              <p className="mt-1 text-[11.5px] text-text-tertiary max-w-xs leading-relaxed">
                {SKILLS_UI_COPY.noIssues}
              </p>
            </div>
          ) : (
            warnings.map((warn, index) => (
              <div
                key={`${warn.sourceId}-${warn.code}-${index}`}
                className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"
              >
                <RiAlertLine className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-caption-2-medium font-semibold text-text-primary">
                      {warn.code}
                    </span>
                    <span className="font-mono text-[10.5px] text-text-tertiary">
                      ({warn.sourceId})
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-text-secondary leading-relaxed">
                    {warn.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="mt-2 flex items-center justify-between sm:justify-between w-full">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            关闭
          </Button>

          {hasIssues ? (
            <Button
              size="sm"
              disabled={isRepairing}
              onClick={handleRepair}
              className="gap-1.5 shadow-xs"
            >
              {isRepairing ? (
                <RiLoader4Line className="size-3.5 animate-spin" />
              ) : (
                <RiShieldCheckLine className="size-3.5" />
              )}
              <span>{SKILLS_UI_COPY.repairAll}</span>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
