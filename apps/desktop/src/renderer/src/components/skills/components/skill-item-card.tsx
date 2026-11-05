/**
 * 单个技能能力卡片 (Skill Item Card)：对标 Raycast / App Store 的独立扩展卡片。
 * 不合规 mute 旁注；trigger 注「本地呼号」；卡片仍可打开；不删。
 */
import {
  RiCheckLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import type { InstalledSkillItem } from "@enjoy-agents/ipc-contract"
import { skillFrontmatterListNotes } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"
import { SKILLS_UI_COPY, TARGET_SHORT_LABELS } from "../constants/skills-ui.constants"
import { resolveSkillTheme } from "../constants/skills-badge-theme"
import { displaySkillDescription } from "../lib/skill-description"
import { hostEnabledTargetIds } from "../lib/skill-visible-for-target"

export function SkillItemCard({
  skill,
  onSelect
}: {
  skill: InstalledSkillItem
  onSelect: () => void
}) {
  const t = useT()
  const theme = resolveSkillTheme(skill.name + " " + (skill.description || ""))
  const ThemeIcon = theme.icon
  const hostTargets = hostEnabledTargetIds(skill.enabledTargetIds)
  const enabledCount = hostTargets.length
  const trigger = skill.trigger || (skill.name.includes(" ") ? undefined : `@${skill.name}`)
  const notes = skillFrontmatterListNotes(skill.issues ?? [])

  return (
    <div
      data-testid="skill-item-card"
      data-skill-name={skill.name}
      onClick={onSelect}
      className={cx(
        "group relative flex flex-col justify-between rounded-2xl border p-4 transition-all cursor-pointer",
        "border-separator-border/70 bg-background-primary-default shadow-2xs hover:border-separator-border hover:shadow-card hover:-translate-y-0.5"
      )}
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cx(
                "flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                theme.badgeBg,
                theme.badgeText,
                theme.badgeBorder
              )}
            >
              <ThemeIcon className="size-5" />
            </div>

            <div className="min-w-0">
              <h4 className="truncate text-body-medium font-semibold text-text-primary tracking-tight">
                {skill.name}
              </h4>
              <p className="truncate text-caption-2-regular font-mono text-text-tertiary">
                {skill.sourceName}
              </p>
            </div>
          </div>

          {trigger ? (
            <span
              data-testid="skill-local-callsign"
              title={t("pages.skills.itemCard.localCallsign")}
              className="inline-flex items-center gap-1 rounded-md bg-accent-500/10 px-1.5 py-0.5 text-caption-2-medium font-mono font-medium text-accent-600 dark:text-accent-400 shrink-0 border border-accent-500/20"
            >
              <RiTerminalBoxLine className="size-3" />
              <span>{trigger}</span>
              <span className="text-[9px] font-sans font-normal text-text-tertiary ml-0.5">
                {t("pages.skills.itemCard.localCallsign")}
              </span>
            </span>
          ) : null}
        </div>

        <p className="text-caption-2-regular text-text-secondary leading-relaxed line-clamp-2 min-h-[32px]">
          {displaySkillDescription(skill.description, SKILLS_UI_COPY.emptySkillDesc)}
        </p>

        {notes.length > 0 ? (
          <p
            data-testid="skill-norm-notes"
            className="text-caption-2-regular text-text-tertiary"
          >
            {notes.join(" · ")}
          </p>
        ) : null}
      </div>

      <div className="mt-3.5 pt-2.5 border-t border-separator-border/40 flex items-center justify-between gap-2 text-caption-2-regular">
        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
          {enabledCount === 0 ? (
            <span className="text-text-tertiary italic text-caption-2-regular">{t("pages.skills.states.noneActive")}</span>
          ) : (
            <div className="flex items-center gap-1 flex-wrap">
              {hostTargets.map((targetId) => (
                <span
                  key={targetId}
                  className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 bg-background-secondary-default text-text-secondary font-medium text-caption-2-medium"
                >
                  <RiCheckLine className="size-2.5 text-state-success-text" />
                  {TARGET_SHORT_LABELS[targetId]}
                </span>
              ))}
            </div>
          )}
        </div>

        <span className="font-medium text-accent-600 dark:text-accent-400 shrink-0 group-hover:translate-x-0.5 transition-transform text-caption-2-regular">
          {t("pages.skills.itemCard.details")}
        </span>
      </div>
    </div>
  )
}
