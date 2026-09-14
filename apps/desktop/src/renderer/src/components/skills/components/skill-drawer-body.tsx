/**
 * 技能详情抽屉滚动区：助手挂载行、元数据与指令正文。
 */
import { RiCheckLine } from "@remixicon/react"
import type { InstalledSkillItem, SkillSource, SkillTargetId } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { AGENT_ARMORY_PROFILES } from "../constants/agent-armory.constants"
import {
  HOST_DEPLOY_TARGET_IDS,
  TARGET_SHORT_LABELS
} from "../constants/skills-ui.constants"

export function SkillDrawerBody({
  skill,
  source,
  hasWorkspace,
  busy,
  metadata,
  bodyText,
  onToggleTarget
}: {
  skill: InstalledSkillItem
  source?: SkillSource
  hasWorkspace: boolean
  busy: boolean
  metadata: Record<string, string> | null
  bodyText: string
  onToggleTarget: (source: SkillSource, targetId: SkillTargetId) => void
}) {
  const t = useT()

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5 [scrollbar-width:thin]">
      {skill.description ? (
        <p className="text-body-regular text-text-secondary leading-relaxed">
          {skill.description}
        </p>
      ) : null}

      {source ? (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="text-caption-1-medium font-semibold text-text-primary">
              {t("pages.skills.drawerBody.targetsTitle")}
            </h4>
            <span className="text-caption-2-regular text-text-tertiary">
              {t("pages.skills.drawerBody.hostHint")}
            </span>
          </div>
          <div className="flex flex-col rounded-2xl border border-separator-border/70 overflow-hidden">
            {HOST_DEPLOY_TARGET_IDS.filter((id) => id !== "workspace-agents" || hasWorkspace).map((targetId, index) => {
              const isEnabled = source.enabledTargetIds.includes(targetId)
              const profile = AGENT_ARMORY_PROFILES[targetId]
              const Icon = profile?.icon
              return (
                <button
                  key={targetId}
                  type="button"
                  disabled={busy}
                  onClick={() => onToggleTarget(source, targetId)}
                  className={cx(
                    "flex items-center gap-3 px-3.5 py-3 text-left transition-colors cursor-pointer",
                    index > 0 && "border-t border-separator-border/50",
                    isEnabled
                      ? "bg-background-secondary-default/40"
                      : "hover:bg-background-secondary-default/30"
                  )}
                >
                  <span
                    className={cx(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl border",
                      isEnabled
                        ? cx(profile?.themeColor.bg, profile?.themeColor.border, profile?.themeColor.text)
                        : "border-separator-border/60 bg-background-secondary-default text-text-tertiary"
                    )}
                  >
                    {Icon ? <Icon className="size-4" /> : null}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-caption-1-medium font-semibold text-text-primary truncate">
                      {TARGET_SHORT_LABELS[targetId]}
                    </span>
                    <span className="block text-caption-2-regular text-text-tertiary truncate">
                      {isEnabled ? t("pages.skills.targets.hostOn") : t("pages.skills.targets.hostOff")}
                    </span>
                  </span>
                  <span
                    className={cx(
                      "flex size-5 items-center justify-center rounded-full border",
                      isEnabled
                        ? "border-accent-500 bg-accent-500 text-text-white"
                        : "border-separator-border/80 text-transparent"
                    )}
                  >
                    <RiCheckLine className="size-3" />
                  </span>
                </button>
              )
            })}
          </div>


        </section>
      ) : null}

      {metadata && (metadata.version || skill.relativeDir) ? (
        <div className="flex flex-wrap gap-1.5">
          {metadata.version ? (
            <span className="rounded-lg border border-separator-border/50 bg-background-secondary-default/50 px-2.5 py-1 text-caption-2-regular font-mono text-text-secondary">
              v{metadata.version}
            </span>
          ) : null}
          {skill.relativeDir ? (
            <span className="rounded-lg border border-separator-border/50 bg-background-secondary-default/50 px-2.5 py-1 text-caption-2-regular font-mono text-text-secondary">
              {skill.relativeDir}
            </span>
          ) : null}
        </div>
      ) : null}

      <section className="flex flex-col gap-2">
        <h4 className="text-caption-1-medium font-semibold text-text-primary">
          {t("pages.skills.drawerBody.instructionsTitle")}
        </h4>
        <pre className="rounded-2xl border border-separator-border/60 bg-background-secondary-default/30 p-4 font-mono text-caption-2-regular text-text-primary whitespace-pre-wrap leading-relaxed">
          {bodyText}
        </pre>
      </section>
    </div>
  )
}
