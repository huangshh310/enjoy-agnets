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

export function WorkflowSettings() {
  const navigate = useNavigate()
  const { preferences, update } = usePrefUpdate()

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Workflow 引擎概览看板 ───────────────────────── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <RiRouteLine className="size-6" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-body-large-semibold text-text-primary">
                  Durable Workflow Engine
                </span>
                <span className="rounded-md bg-background-secondary-default px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                  SQLite Checkpoints
                </span>
              </div>
              <span className="text-caption-2-regular text-text-tertiary mt-0.5">
                Executes multi-step Plan → Act → Verify DAG pipelines with step-level rollback and checkpoint recovery.
              </span>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => void navigate({ to: "/workflows" })}
            className="inline-flex items-center gap-1.5 cursor-pointer h-8 text-caption-2-medium shrink-0"
          >
            <RiRouteLine className="size-3.5 text-emerald-500" />
            <span>Open Workflow Studio</span>
            <RiArrowRightLine className="size-3.5 opacity-60 ml-0.5" />
          </Button>
        </div>
      </div>

      {/* ─── 检查点与崩溃恢复策略 ─────────────────────────── */}
      <SettingsCard title="Checkpoint & Recovery Policies">
        <SettingsRow
          title="Resume on launch"
          description="Automatically resume paused workflows from their last step checkpoint when restarting the IDE."
        >
          <Switch
            checked={preferences?.workflowAutoResume ?? true}
            onCheckedChange={(value) => void update({ workflowAutoResume: value })}
          />
        </SettingsRow>

        <SettingsRow
          title="Step-level durability"
          description="Every step writes its artifact summary and status to SQLite runs/run_steps before advancing to descendants."
        >
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-caption-2-medium text-emerald-600 dark:text-emerald-400">
            <RiShieldCheckLine className="size-3.5" />
            <span>Active & Persistent</span>
          </span>
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}
