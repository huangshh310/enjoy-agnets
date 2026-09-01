/**
 * 自定义 Workflow 语法输入与步骤预览。
 */
import { RiArrowRightLine, RiLoader4Line, RiPlayLine, RiRouteLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { stepsFromChain } from "../lib/steps-from-chain"

export function WorkflowPipelineBuilder({
  chain,
  onChainChange,
  sessionId,
  isStarting,
  onStart
}: {
  chain: string
  onChainChange: (value: string) => void
  sessionId: string | null
  isStarting: boolean
  onStart: () => void
}) {
  const previewSteps = stepsFromChain(chain)
  return (
    <section className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-separator-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500">
            <RiRouteLine className="size-3.5" />
          </div>
          <h3 className="text-body-medium font-semibold text-text-primary">Custom Workflow Pipeline Builder</h3>
        </div>
        <span className="text-caption-2-medium text-text-tertiary">
          Chain syntax: <code className="font-mono text-[11px]">step1&gt;step2&gt;step3</code>
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-3.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Input
              value={chain}
              onChange={(event) => onChainChange(event.target.value)}
              placeholder="e.g. plan>act>verify"
              className="bg-background-secondary-default font-mono text-body-medium focus-visible:bg-background-primary-default"
            />
          </div>
          <Button
            size="sm"
            data-testid="workflow-start"
            onClick={onStart}
            disabled={!sessionId || isStarting || !chain.trim()}
            className="shrink-0 gap-1.5 shadow-xs"
          >
            {isStarting ? <RiLoader4Line className="size-4 animate-spin" /> : <RiPlayLine className="size-4" />}
            <span>Start Pipeline</span>
          </Button>
        </div>
        {previewSteps.length > 0 ? (
          <div className="flex items-center gap-2 overflow-x-auto rounded-xl bg-background-secondary-default/70 p-2.5">
            <span className="shrink-0 text-[11px] font-medium text-text-tertiary">Live Pipeline Preview:</span>
            <div className="flex items-center gap-1.5 text-[11px]">
              {previewSteps.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-1.5">
                  {idx > 0 ? <RiArrowRightLine className="size-3 text-text-tertiary" /> : null}
                  <span className="rounded-md border border-border-button-default bg-background-primary-default px-2 py-0.5 font-mono font-medium text-text-primary shadow-xs">
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
