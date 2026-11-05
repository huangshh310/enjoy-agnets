/**
 * 技能详情抽屉滚动区：助手挂载行、元数据与指令正文。
 */
import { RiCheckLine } from "@remixicon/react"
import type { InstalledSkillItem, SkillSource, SkillTargetId } from "@enjoy-agents/ipc-contract"
import { skillFrontmatterIssueChip } from "@enjoy-agents/ipc-contract"
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

      {(skill.issues?.length || skill.allowedTools) ? (
        <div
          data-testid="skill-drawer-norm"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-separator-border bg-background-secondary-default/80 px-3 py-2"
        >
          <span className="text-caption-2-medium text-text-tertiary font-medium">{t("pages.skills.docInspector.normLabel")}</span>
          {(skill.issues ?? []).map((row) => (
            <span
              key={`${row.path}:${row.code}`}
              data-testid="skill-norm-chip"
              className="inline-flex items-center rounded-md bg-status-yellow-background/15 px-2 py-0.5 text-caption-2-medium font-medium text-status-yellow-text ring-1 ring-status-yellow-text/25"
            >
              {skillFrontmatterIssueChip(row)}
            </span>
          ))}
          {skill.allowedTools ? (
            <span
              data-testid="skill-allowed-tools-chip"
              title={t("pages.skills.docInspector.allowedToolsHint")}
              className="inline-flex items-center gap-1 rounded-md bg-background-secondary-default px-2 py-0.5 text-caption-2-medium font-medium text-text-tertiary ring-1 ring-separator-border"
            >
              {t("pages.skills.docInspector.allowedToolsLabel")}
            </span>
          ) : null}
        </div>
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
                        ? "border-cta bg-cta text-cta-foreground"
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
