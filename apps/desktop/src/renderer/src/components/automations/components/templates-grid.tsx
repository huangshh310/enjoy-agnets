/**
 * 开箱即用自动化模版。Enable 后写入库。
 */
import { RiAddLine, RiCursorLine, RiSaveLine, RiSparklingLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import type { Automation } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { getAutomationTemplates, type AutomationTemplate } from "../constants"

export function AutomationTemplatesGrid({
  automations,
  onEnable
}: {
  automations: Automation[]
  onEnable: (tpl: AutomationTemplate) => void
}) {
  const t = useT()
  const templates = getAutomationTemplates(t)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-5 items-center justify-center rounded-md bg-accent-500/10 text-accent-500">
            <RiSparklingLine className="size-3.5" />
          </div>
          <h3 className="text-body-medium font-semibold text-text-primary">
            {t("studio.automations.templatesTitle")}
          </h3>
        </div>
        <span className="text-caption-2-medium text-text-tertiary">{t("studio.automations.templatesSubtitle")}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((tpl) => {
          const alreadyActive = automations.some((item) => item.name === tpl.name)
          return (
            <div
              key={tpl.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-4.5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cx(
                        "flex size-8 shrink-0 items-center justify-center rounded-xl shadow-xs",
                        tpl.trigger === "on_save" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                      )}
                    >
                      {tpl.trigger === "on_save" ? (
                        <RiSaveLine className="size-4" />
                      ) : (
                        <RiCursorLine className="size-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-caption-1-medium font-semibold text-text-primary transition-colors group-hover:text-accent-500">
                        {tpl.name}
                      </h4>
                      <span className="font-mono text-[10px] text-text-tertiary uppercase">
                        {tpl.category} ·{" "}
                        {tpl.trigger === "on_save"
                          ? t("studio.automations.fileSaveHook")
                          : t("studio.automations.manualTrigger")}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                    {tpl.badge}
                  </span>
                </div>
                <p className="mt-2.5 line-clamp-2 text-[12px] leading-relaxed text-text-secondary">{tpl.prompt}</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
                <span className="text-[11px] text-text-tertiary">
                  {alreadyActive
                    ? t("studio.automations.alreadyConfigured")
                    : t("studio.automations.readyToEnable")}
                </span>
                <Button
                  size="sm"
                  variant={alreadyActive ? "outline" : "default"}
                  onClick={() => onEnable(tpl)}
                  className="h-7 shrink-0 gap-1 px-2.5 text-caption-2-medium shadow-xs"
                >
                  <RiAddLine className="size-3" />
                  <span>
                    {alreadyActive ? t("studio.automations.addAnother") : t("studio.automations.enableRule")}
                  </span>
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
