/**
 * 预置 Workflow 配方卡片。点 Run 把 chain 交给页面启动。
 */
import { RiArrowRightLine, RiPlayLine, RiSparklingLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { WORKFLOW_RECIPES } from "../lib/constants"

export function WorkflowRecipesGrid({
  sessionId,
  isStarting,
  onRun
}: {
  sessionId: string | null
  isStarting: boolean
  onRun: (chain: string) => void
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-5 items-center justify-center rounded-md bg-accent-500/10 text-accent-500">
            <RiSparklingLine className="size-3.5" />
          </div>
          <h3 className="text-body-medium font-semibold text-text-primary">
            Pre-built Workflow Recipes · 经典自主流程模版
          </h3>
        </div>
        <span className="text-caption-2-medium text-text-tertiary">1-click autonomous execution</span>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        {WORKFLOW_RECIPES.map((recipe) => (
          <div
            key={recipe.id}
            className="group relative flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-4.5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-body-medium font-semibold text-text-primary transition-colors group-hover:text-accent-500">
                    {recipe.title}
                  </h4>
                  <p className="mt-0.5 text-[11px] font-medium text-accent-600 dark:text-accent-400">
                    {recipe.subtitle}
                  </p>
                </div>
                <span className="rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                  {recipe.category}
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">{recipe.description}</p>
              <div className="mt-3.5 flex items-center gap-1.5 rounded-xl bg-background-secondary-default/80 p-2 text-[11px]">
                {recipe.steps.map((step, idx) => (
                  <div key={step} className="flex items-center gap-1.5">
                    {idx > 0 ? <RiArrowRightLine className="size-3 text-text-tertiary" /> : null}
                    <span className="rounded-md border border-border-button-default bg-background-primary-default px-2 py-0.5 font-mono font-medium text-text-primary shadow-2xs">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
              <span className="font-mono text-[10px] text-text-tertiary">Syntax: {recipe.chain}</span>
              <Button
                size="sm"
                disabled={!sessionId || isStarting}
                onClick={() => onRun(recipe.chain)}
                className="h-7 gap-1.5 px-3 text-caption-2-medium shadow-xs"
              >
                <RiPlayLine className="size-3.5" />
                <span>Run Recipe</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
