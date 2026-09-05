/**
 * 单个技能能力卡片 (Skill Item Card)：对标 Raycast / App Store 的独立扩展卡片。
 * 将 189+ 个技能平铺为直观、可搜索、可直接交互的能力单元，告别文件夹式嵌套。
 */
import {
  RiCheckLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import type { InstalledSkillItem } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { TARGET_SHORT_LABELS } from "../constants/skills-ui.constants"
import { resolveSkillTheme } from "../constants/skills-badge-theme"

export function SkillItemCard({
  skill,
  onSelect
}: {
  skill: InstalledSkillItem
  onSelect: () => void
}) {
  const theme = resolveSkillTheme(skill.name + " " + (skill.description || ""))
  const ThemeIcon = theme.icon
  const enabledCount = skill.enabledTargetIds.length
  const trigger = skill.trigger || (skill.name.includes(" ") ? undefined : `@${skill.name}`)

  return (
    <div
      onClick={onSelect}
      className={cx(
        "group relative flex flex-col justify-between rounded-2xl border p-4 transition-all cursor-pointer",
        "border-separator-border/70 bg-background-primary-default shadow-2xs hover:border-separator-border hover:shadow-card hover:-translate-y-0.5"
      )}
    >
      <div className="flex flex-col gap-2.5">
        {/* 卡片头部：图标微标 + 技能名称 + 触发词 */}
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
              <p className="truncate text-[11px] font-mono text-text-tertiary">
                {skill.sourceName}
              </p>
            </div>
          </div>

          {trigger ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-accent-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-accent-600 dark:text-accent-400 shrink-0 border border-accent-500/20">
              <RiTerminalBoxLine className="size-3" />
              <span>{trigger}</span>
            </span>
          ) : null}
        </div>

        {/* 技能描述 */}
        <p className="text-[11.5px] text-text-secondary leading-relaxed line-clamp-2 min-h-[32px]">
          {skill.description || "提供专业提示词与执行指引能力"}
        </p>
      </div>

      {/* 底栏：已生效的 Agent 徽标 */}
      <div className="mt-3.5 pt-2.5 border-t border-separator-border/40 flex items-center justify-between gap-2 text-[10.5px]">
        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
          {enabledCount === 0 ? (
            <span className="text-text-tertiary italic text-[10px]">未激活任何 Agent</span>
          ) : (
            <div className="flex items-center gap-1 flex-wrap">
              {skill.enabledTargetIds.slice(0, 3).map((targetId) => (
                <span
                  key={targetId}
                  className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 bg-background-secondary-default text-text-secondary font-medium text-[10px]"
                >
                  <RiCheckLine className="size-2.5 text-emerald-500" />
                  {TARGET_SHORT_LABELS[targetId]}
                </span>
              ))}
              {skill.enabledTargetIds.length > 3 ? (
                <span className="text-[9.5px] text-text-tertiary">
                  +{skill.enabledTargetIds.length - 3}
                </span>
              ) : null}
            </div>
          )}
        </div>

        <span className="font-medium text-accent-600 dark:text-accent-400 shrink-0 group-hover:translate-x-0.5 transition-transform text-[11px]">
          详情 →
        </span>
      </div>
    </div>
  )
}
