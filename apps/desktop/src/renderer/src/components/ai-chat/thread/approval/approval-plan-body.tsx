/**
 * plan 表面：标题、摘要、待办列表；展开后看真实 diff / 提交说明。
 * 禁止倒计时自动放行。
 */
import { useState } from "react"
import { RiCheckboxBlankCircleLine, RiListCheck3 } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { ApprovalPreview } from "../approval-preview"
import type { ApprovalPlanStep } from "./approval.types"

export function ApprovalPlanBody({
  headline,
  summary,
  steps,
  toolName,
  args,
  showDiff
}: {
  headline: string
  summary: string
  steps: ApprovalPlanStep[]
  toolName: string
  args: Record<string, unknown>
  showDiff: boolean
}) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const preview = steps.slice(0, 3)
  const rest = steps.slice(3)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5 pl-0.5">
        <p className="text-body-medium text-text-primary">{headline}</p>
        <p className="whitespace-pre-line text-caption-2-regular text-text-secondary">{summary}</p>
      </div>
      <div className="rounded-lg bg-background-secondary-default px-3 py-2.5">
        <div className="flex items-center gap-2 text-caption-1-medium text-text-primary">
          <RiListCheck3 className="size-3.5" aria-hidden />
          <span>{t("chat.todos")}</span>
          <span className="ml-auto font-mono text-caption-2-regular text-text-tertiary">{steps.length}</span>
        </div>
        <PlanStepList steps={preview} />
        {rest.length > 0 ? (
          <>
            {expanded ? <PlanStepList steps={rest} /> : null}
            <button
              type="button"
              className="mt-2 cursor-pointer text-caption-2-medium text-text-tertiary hover:text-text-primary"
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded ? t("chat.approvalShowLess") : t("chat.approvalMore", { n: rest.length })}
            </button>
          </>
        ) : null}
      </div>
      {showDiff ? <PlanDiffToggle name={toolName} args={args} /> : null}
    </div>
  )
}

function PlanStepList({ steps }: { steps: ApprovalPlanStep[] }) {
  return (
    <ul className="mt-2 flex flex-col gap-2">
      {steps.map((step) => (
        <li key={step.id} className="flex items-start gap-2 text-caption-1-regular text-text-secondary">
          <RiCheckboxBlankCircleLine className="mt-0.5 size-3.5 shrink-0 text-text-tertiary" aria-hidden />
          <span>
            {step.title}
            {step.detail ? <span className="mt-0.5 block text-caption-2-regular text-text-tertiary">{step.detail}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  )
}

function PlanDiffToggle({ name, args }: { name: string; args: Record<string, unknown> }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="w-fit cursor-pointer text-caption-2-medium text-accent-500 hover:underline"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? t("chat.approvalHideDiff") : t("chat.approvalViewDiff")}
      </button>
      {open ? <ApprovalPreview name={name} args={args} /> : null}
    </div>
  )
}
