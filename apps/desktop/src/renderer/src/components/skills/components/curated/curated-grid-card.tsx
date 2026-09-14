/**
 * 精选集市能力套件卡片 (Curated Grid Card)。
 * 对齐 Figma Community / Raycast Store 的现代卡片质感，展示指令胶囊与即时安装反馈。
 */
import {
  RiCheckLine,
  RiDownloadLine,
  RiLoader4Line,
  RiShieldCheckLine,
  RiStarFill
} from "@remixicon/react"
import type { CuratedSkillSource } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { resolveSkillTheme } from "../../constants/skills-badge-theme"

export function CuratedGridCard({
  item,
  isInstalled,
  busy,
  onInstall
}: {
  item: CuratedSkillSource
  isInstalled: boolean
  busy: boolean
  onInstall: (item: CuratedSkillSource) => void
}) {
  const t = useT()
  const theme = resolveSkillTheme(item.id || item.title)
  const ThemeIcon = theme.icon

  return (
    <div
      className={cx(
        "group relative flex flex-col justify-between rounded-3xl border p-5 transition-all",
        "border-separator-border/80 bg-background-primary-default shadow-2xs hover:border-separator-border hover:shadow-card hover:-translate-y-0.5"
      )}
    >
      <div className="flex flex-col gap-3">
        {/* 头部：Icon 徽标 + 标题 + Stars 徽章 */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cx(
                "flex size-12 shrink-0 items-center justify-center rounded-2xl border shadow-2xs transition-transform group-hover:scale-105",
                theme.badgeBg,
                theme.badgeText,
                theme.badgeBorder
              )}
            >
              <ThemeIcon className="size-6" />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-body-medium font-semibold text-text-primary tracking-tight">
                {item.title}
              </h3>
              <div className="flex items-center gap-1.5 text-caption-2-regular text-text-tertiary">
                <span className="truncate">{item.author}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <RiShieldCheckLine className="size-3" />
                  <span>{t("pages.skills.states.curated")}</span>
                </span>
              </div>
            </div>
          </div>

          {item.stars ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-mono font-medium text-amber-600 dark:text-amber-400 shrink-0 border border-amber-500/20">
              <RiStarFill className="size-2.5 text-amber-500" />
              {item.stars.toLocaleString()}
            </span>
          ) : null}
        </div>

        {/* 价值陈述描述 */}
        <p className="text-[12.5px] text-text-secondary leading-relaxed line-clamp-2 min-h-[38px]">
          {item.description}
        </p>

        {/* 能力指令胶囊 */}
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {item.featuredSkills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-0.5 rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[10.5px] font-mono font-medium text-purple-700 dark:text-purple-300"
            >
              <span className="opacity-50 font-semibold">/</span>
              <span>{skill}</span>
            </span>
          ))}
          {item.featuredSkills.length > 3 ? (
            <span className="inline-flex items-center rounded-md border border-separator-border/60 bg-background-secondary-default px-1.5 py-0.5 text-[10px] font-mono font-medium text-text-secondary">
              +{item.featuredSkills.length - 3}
            </span>
          ) : null}
        </div>
      </div>

      {/* 底部动作栏：能力数量与安装按钮 */}
      <div className="mt-4 pt-3.5 border-t border-separator-border/50 flex items-center justify-between">
        <span className="text-[11.5px] text-text-tertiary">
          {t("pages.skills.gridCard.countSkills", { n: item.skillCount ?? "" })}
        </span>

        {isInstalled ? (
          <div className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald-600 dark:text-emerald-400">
            <RiCheckLine className="size-3.5" />
            <span>{t("pages.skills.states.equipped")}</span>
          </div>
        ) : (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => onInstall(item)}
            className="gap-1.5 h-8 px-3 text-caption-2-medium shadow-2xs"
          >
            {busy ? (
              <RiLoader4Line className="size-3.5 animate-spin" />
            ) : (
              <RiDownloadLine className="size-3.5" />
            )}
            <span>{t("pages.skills.gridCard.getNow")}</span>
          </Button>
        )}
      </div>
    </div>
  )
}
