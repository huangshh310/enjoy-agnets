/**
 * 目标 Agent 投影控制卡片 (Target Deployments Card)。
 * 将死板灰白的药丸表单升级为现代 Agent 插槽矩阵 (Slot Cards)，呈现品牌专属图标与部署同步状态。
 */
import {
  RiCheckLine,
  RiCompass3Line,
  RiFolderLine,
  RiShieldCheckLine
} from "@remixicon/react"
import type { SkillSource, SkillTargetId } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import {
  GLOBAL_TARGET_IDS,
  SKILLS_UI_COPY,
  TARGET_SHORT_LABELS,
  WORKSPACE_TARGET_IDS
} from "../../constants/skills-ui.constants"
import { AGENT_ARMORY_PROFILES } from "../../constants/agent-armory.constants"

export function TargetDeploymentsCard({
  source,
  hasWorkspace,
  busy,
  onToggleTarget
}: {
  source: SkillSource
  hasWorkspace: boolean
  busy: boolean
  onToggleTarget: (source: SkillSource, targetId: SkillTargetId) => void
}) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-separator-border/80 bg-background-primary-default p-5 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <RiShieldCheckLine className="size-4 text-accent-600 dark:text-accent-400" />
            <h3 className="text-caption-1-medium font-semibold text-text-primary">
              {SKILLS_UI_COPY.targetDeployments}
            </h3>
          </div>
          <p className="text-[11.5px] text-text-secondary">
            {SKILLS_UI_COPY.targetDeploymentsDesc}
          </p>
        </div>

        <span className="text-[11px] font-mono text-text-tertiary">
          已激活 {source.enabledTargetIds.length} / {GLOBAL_TARGET_IDS.length} 个目标环境
        </span>
      </div>

      {/* 全局 Agent 插槽卡片网格 */}
      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
        {GLOBAL_TARGET_IDS.map((targetId) => {
          const isEnabled = source.enabledTargetIds.includes(targetId)
          const profile = AGENT_ARMORY_PROFILES[targetId]
          const TargetIcon = profile?.icon || RiCompass3Line

          return (
            <button
              key={targetId}
              type="button"
              disabled={busy}
              onClick={() => onToggleTarget(source, targetId)}
              className={cx(
                "group relative flex flex-col justify-between rounded-2xl border p-3 text-left transition-all cursor-pointer",
                "active:scale-[0.98]",
                isEnabled
                  ? "border-accent-500/50 bg-accent-500/5 shadow-2xs"
                  : "border-separator-border/60 bg-background-secondary-default/30 hover:border-separator-border hover:bg-background-secondary-default/60"
              )}
            >
              <div className="flex items-start justify-between gap-1 mb-2">
                <div
                  className={cx(
                    "flex size-8 items-center justify-center rounded-xl border transition-colors",
                    isEnabled
                      ? cx(profile?.themeColor.bg, profile?.themeColor.border, profile?.themeColor.text)
                      : "border-separator-border/60 bg-background-primary-default text-text-tertiary"
                  )}
                >
                  <TargetIcon className="size-4" />
                </div>

                <span
                  className={cx(
                    "flex size-4.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all",
                    isEnabled
                      ? "bg-accent-500 text-text-white shadow-xs scale-105"
                      : "border border-separator-border/80 bg-background-primary-default text-text-tertiary"
                  )}
                >
                  {isEnabled ? <RiCheckLine className="size-3" /> : null}
                </span>
              </div>

              <div>
                <span className="text-caption-2-medium font-semibold text-text-primary block truncate">
                  {TARGET_SHORT_LABELS[targetId]}
                </span>
                <span
                  className={cx(
                    "text-[10.5px] font-mono",
                    isEnabled
                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-text-tertiary"
                  )}
                >
                  {isEnabled ? "已同步生效" : "未挂载投影"}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* 工作区目标（仅当存在打开的工作区时） */}
      {hasWorkspace ? (
        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-separator-border/40 text-caption-2-regular">
          <div className="flex items-center gap-1.5 text-text-tertiary">
            <RiFolderLine className="size-3.5" />
            <span className="font-medium text-[11px]">当前工作区绑定:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {WORKSPACE_TARGET_IDS.map((targetId) => {
              const isEnabled = source.enabledTargetIds.includes(targetId)
              return (
                <button
                  key={targetId}
                  type="button"
                  disabled={busy}
                  onClick={() => onToggleTarget(source, targetId)}
                  className={cx(
                    "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-[11px] transition-all cursor-pointer",
                    isEnabled
                      ? "border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium shadow-2xs"
                      : "border-separator-border/60 bg-background-secondary-default/40 text-text-tertiary hover:border-separator-border hover:text-text-secondary"
                  )}
                >
                  {isEnabled ? <RiCheckLine className="size-3 text-purple-500" /> : null}
                  <span>{TARGET_SHORT_LABELS[targetId]}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </section>
  )
}
