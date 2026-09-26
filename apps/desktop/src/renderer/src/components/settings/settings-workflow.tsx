/**
 * Settings → Workflow recovery：持久化工作流与检查点恢复配置。
 * 规范应用启动时自动续跑策略、多步任务 DAG 检查点持久化与子 Agent 协同限制。
 */
import { useNavigate } from "@tanstack/react-router"
import {
  RiArrowRightLine,
  RiRouteLine,
  RiShieldCheckLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { SettingsCard, SettingsRow } from "./settings-row"
import { usePrefUpdate } from "./settings-pref"
import { useT } from "@renderer/i18n"

export function WorkflowSettings() {
  const t = useT()
  const navigate = useNavigate()
  const { preferences, update } = usePrefUpdate()

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Workflow 引擎概览看板 ───────────────────────── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-state-success-text/20 bg-state-success-text/10 text-state-success-text dark:text-state-success-text">
              <RiRouteLine className="size-6" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-title-3-semibold text-text-primary">
                  {t("settings.workflow.hubTitle")}
                </span>
                <span className="rounded-md bg-background-secondary-default px-2 py-0.5 text-caption-2-medium font-medium text-text-tertiary">
                  {t("settings.workflow.hubBadge")}
                </span>
              </div>
              <span className="text-caption-2-regular text-text-tertiary mt-0.5">
                {t("settings.workflow.hubDesc")}
              </span>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => void navigate({ to: "/workflows" })}
            className="inline-flex items-center gap-1.5 cursor-pointer h-8 text-caption-2-medium shrink-0"
          >
            <RiRouteLine className="size-3.5 text-state-success-text" />
            <span>{t("settings.workflow.openStudio")}</span>
            <RiArrowRightLine className="size-3.5 opacity-60 ml-0.5" />
          </Button>
        </div>
      </div>

      {/* ─── 检查点与崩溃恢复策略 ─────────────────────────── */}
      <SettingsCard title={t("settings.workflow.policies")}>
        <SettingsRow title={t("settings.workflow.resume")} description={t("settings.workflow.resumeDesc")}>
          <Switch
            checked={preferences?.workflowAutoResume ?? true}
            onCheckedChange={(value) => void update({ workflowAutoResume: value })}
          />
        </SettingsRow>

        <SettingsRow title={t("settings.workflow.durability")} description={t("settings.workflow.durabilityDesc")}>
          <span className="inline-flex items-center gap-1 rounded-full border border-state-success-text/20 bg-state-success-text/10 px-2.5 py-0.5 text-caption-2-medium text-state-success-text dark:text-state-success-text">
            <RiShieldCheckLine className="size-3.5" />
            <span>{t("settings.workflow.activePersistent")}</span>
          </span>
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}
