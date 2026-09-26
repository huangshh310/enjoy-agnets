/**
 * 精选集市非对称 Bento 聚光灯展台 (Curated Bento Hero)。
 * 结合本周焦点套件 (Spotlight) 与社区热门能力脉冲榜 (Trending Pulse)，营造高密度 IDE 质感。
 */
import {
  RiCheckLine,
  RiDownloadLine,
  RiFireFill,
  RiFlashlightFill,
  RiLoader4Line,
  RiStarFill
} from "@remixicon/react"
import type { CuratedSkillSource } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"

export function CuratedBentoHero({
  spotlightItem,
  trendingItems,
  isSpotlightInstalled,
  installedOrigins,
  busy,
  onInstall
}: {
  spotlightItem: CuratedSkillSource
  trendingItems: CuratedSkillSource[]
  isSpotlightInstalled: boolean
  installedOrigins: Set<string>
  busy: boolean
  onInstall: (source: CuratedSkillSource) => void
}) {
  const t = useT()

  return (
    <div className="grid gap-4 lg:grid-cols-12 items-stretch">
      {/* 左侧 2/3：聚光灯官方焦点卡 */}
      <div className="relative overflow-hidden rounded-3xl border border-accent-500/30 bg-gradient-to-br from-accent-500/10 via-background-primary-default to-chart-1/10 p-6 sm:p-7 shadow-card lg:col-span-8 flex flex-col justify-between">
        {/* 光晕微斑 */}
        <div className="pointer-events-none absolute -right-8 -top-8 size-48 rounded-full bg-accent-500/15 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/20 px-2.5 py-0.5 text-caption-2-medium font-semibold text-accent-700 dark:text-accent-300 border border-accent-500/30">
              <RiFlashlightFill className="size-3 text-accent-500" />
              <span>{t("pages.skills.hero.spotlightBadge")}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-status-yellow-background/10 px-2 py-0.5 text-caption-2-medium font-mono font-medium text-status-yellow-text dark:text-status-yellow-text border border-status-yellow-text/20">
              <RiStarFill className="size-3 text-status-yellow-text" />
              {spotlightItem.stars?.toLocaleString()} Stars
            </span>
            <span className="text-caption-2-regular font-mono text-text-tertiary">
              {spotlightItem.author}
            </span>
          </div>

          <div>
            <h2 className="text-title-1-semibold tracking-tight text-text-primary">
              {spotlightItem.title}
            </h2>
            <p className="mt-1.5 max-w-xl text-body-2-regular leading-relaxed text-text-secondary">
              {spotlightItem.description}
            </p>
          </div>

          {/* 包含的核心指令胶囊 */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {spotlightItem.featuredSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 rounded-lg bg-background-primary-default/90 px-2.5 py-1 text-caption-2-regular font-mono text-text-primary border border-separator-border/70 shadow-2xs"
              >
                <span className="text-accent-600 font-semibold">/</span>
                <span>{skill}</span>
              </span>
            ))}
          </div>
        </div>

        {/* 底部动作栏：支持生态 + 安装主按钮 */}
        <div className="relative z-10 mt-6 pt-4 border-t border-separator-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-caption-2-regular text-text-tertiary">
            <span>{t("pages.skills.hero.runtimeLabel")}</span>
            <span className="rounded bg-background-secondary-default/80 px-1.5 py-0.5 font-mono text-caption-2-regular text-text-secondary">
              Enjoy · Claude · Cursor · Codex · Pi · OMP
            </span>
          </div>

          {isSpotlightInstalled ? (
            <div className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-state-success-text/15 px-4 py-2 text-caption-1-medium font-semibold text-state-success-text dark:text-state-success-text border border-state-success-text/30 shadow-2xs">
              <RiCheckLine className="size-4" />
              <span>{t("pages.skills.hero.installedFull")}</span>
            </div>
          ) : (
            <Button
              size="default"
              disabled={busy}
              onClick={() => onInstall(spotlightItem)}
              className="gap-2 h-9 px-4 text-caption-1-medium font-semibold shadow-xs"
            >
              {busy ? (
                <RiLoader4Line className="size-4 animate-spin" />
              ) : (
                <RiDownloadLine className="size-4" />
              )}
              <span>{t("pages.skills.hero.installAll", { n: spotlightItem.skillCount ?? "" })}</span>
            </Button>
          )}
        </div>
      </div>

      {/* 右侧 1/3：社区热门趋势榜微件 (Trending Pulse) */}
      <div className="flex flex-col rounded-3xl border border-separator-border/80 bg-background-primary-default p-5 shadow-card lg:col-span-4">
        <div className="flex items-center justify-between pb-2.5 border-b border-separator-border/50">
          <div className="flex items-center gap-1.5 text-caption-1-medium font-semibold text-text-primary">
            <RiFireFill className="size-4 text-text-error-primary" />
            <span>{t("pages.skills.hero.trendingTitle")}</span>
          </div>
          <span className="text-caption-2-regular font-mono text-text-tertiary">Top Installs</span>
        </div>

        {/* 榜单条目列表：精美金银铜微标 + 紧凑间距 */}
        <div className="flex-1 flex flex-col justify-center divide-y divide-separator-border/40 py-1">
          {trendingItems.slice(0, 4).map((item, index) => {
            const locator = item.locator.toLowerCase()
            const isInstalled =
              installedOrigins.has(locator) ||
              installedOrigins.has(item.id.toLowerCase()) ||
              installedOrigins.has(item.name.toLowerCase())

            const rank = index + 1
            const rankBadgeStyle =
              rank === 1
                ? "bg-status-yellow-background/20 text-status-yellow-text dark:text-status-yellow-text border-status-yellow-text/40 font-bold"
                : rank === 2
                  ? "bg-background-secondary-default/20 text-text-secondary dark:text-text-secondary border-separator-border/40 font-bold"
                  : rank === 3
                    ? "bg-status-yellow-background/20 text-status-yellow-text dark:text-status-yellow-text border-status-yellow-text/40 font-bold"
                    : "bg-background-secondary-default text-text-tertiary border-separator-border/60"

            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-2.5 gap-2.5 hover:bg-background-secondary-default/30 px-1 -mx-1 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={cx(
                      "flex size-5.5 shrink-0 items-center justify-center rounded-lg border text-caption-2-regular font-mono shadow-2xs",
                      rankBadgeStyle
                    )}
                  >
                    {rank}
                  </span>
                  <div className="min-w-0">
                    <h4 className="truncate text-caption-2-medium font-semibold text-text-primary">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-caption-2-regular text-text-tertiary">
                      <span>{item.stars?.toLocaleString()} ★</span>
                      <span>·</span>
                      <span>{t("pages.skills.hero.countItems", { n: item.skillCount ?? "" })}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {isInstalled ? (
                    <span className="inline-flex items-center gap-0.5 text-caption-2-medium text-state-success-text dark:text-state-success-text font-medium">
                      <RiCheckLine className="size-3" />
                      <span>{t("pages.skills.hero.installedShort")}</span>
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => onInstall(item)}
                      className="h-6.5 px-2 text-caption-2-regular shadow-2xs"
                    >
                      <span>{t("pages.skills.hero.get")}</span>
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 底部指标微件：增加状态感知与信赖背书 */}
        <div className="pt-2.5 border-t border-separator-border/40 flex items-center justify-between text-caption-2-regular text-text-tertiary">
          <div className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-state-success-base animate-pulse" />
            <span>{t("pages.skills.hero.syncHint")}</span>
          </div>
          <span className="font-mono">{t("pages.skills.hero.offline")}</span>
        </div>
      </div>
    </div>
  )
}
