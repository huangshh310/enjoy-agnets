/**
 * 宿主技能目录投影：Enjoy 全局与工作区 .agents/skills。
 */
import {
  RiCheckLine,
  RiCompass3Line,
  RiShieldCheckLine
} from "@remixicon/react"
import type { SkillSource, SkillTargetId } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"
import {
  HOST_DEPLOY_TARGET_IDS,
  SKILLS_UI_COPY,
  TARGET_SHORT_LABELS
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
  const t = useT()

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
          <p className="text-caption-2-regular text-text-secondary">
            {t("pages.skills.targets.hostDesc")}
          </p>
        </div>
      </div>

      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3">
        {HOST_DEPLOY_TARGET_IDS.filter((id) => id !== "workspace-agents" || hasWorkspace).map((targetId) => {
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
                    "flex size-4.5 shrink-0 items-center justify-center rounded-full text-caption-2-bold font-bold transition-all",
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
                    "text-caption-2-regular font-mono",
                    isEnabled
                      ? "text-state-success-text dark:text-state-success-text font-medium"
                      : "text-text-tertiary"
                  )}
                >
                  {isEnabled ? t("pages.skills.targets.hostOn") : t("pages.skills.targets.hostOff")}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
