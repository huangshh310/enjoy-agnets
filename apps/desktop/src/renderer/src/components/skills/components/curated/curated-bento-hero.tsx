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
  return (
    <div className="grid gap-4 lg:grid-cols-12 items-stretch">
      {/* 左侧 2/3：聚光灯官方焦点卡 */}
      <div className="relative overflow-hidden rounded-3xl border border-accent-500/30 bg-gradient-to-br from-accent-500/10 via-background-primary-default to-cyan-500/10 p-6 sm:p-7 shadow-card lg:col-span-8 flex flex-col justify-between">
        {/* 光晕微斑 */}
        <div className="pointer-events-none absolute -right-8 -top-8 size-48 rounded-full bg-accent-500/15 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/20 px-2.5 py-0.5 text-caption-2-medium font-semibold text-accent-700 dark:text-accent-300 border border-accent-500/30">
              <RiFlashlightFill className="size-3 text-accent-500" />
              <span>官方本周焦点推荐</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <RiStarFill className="size-3 text-amber-500" />
              {spotlightItem.stars?.toLocaleString()} Stars
            </span>
            <span className="text-[11.5px] font-mono text-text-tertiary">
              {spotlightItem.author}
            </span>
          </div>

          <div>
            <h2 className="text-title-1-semibold tracking-tight text-text-primary">
              {spotlightItem.title}
            </h2>
            <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-text-secondary">
              {spotlightItem.description}
            </p>
          </div>

          {/* 包含的核心指令胶囊 */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {spotlightItem.featuredSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 rounded-lg bg-background-primary-default/90 px-2.5 py-1 text-[11px] font-mono text-text-primary border border-separator-border/70 shadow-2xs"
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
            <span>支持运行时:</span>
            <span className="rounded bg-background-secondary-default/80 px-1.5 py-0.5 font-mono text-[10.5px] text-text-secondary">
              Enjoy · Claude · Cursor · Codex · Pi · OMP
            </span>
          </div>

          {isSpotlightInstalled ? (
            <div className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 px-4 py-2 text-caption-1-medium font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs">
              <RiCheckLine className="size-4" />
              <span>已全套装备至 AI</span>
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
              <span>一键装备完整套件 ({spotlightItem.skillCount} 项能力)</span>
            </Button>
          )}
        </div>
      </div>

      {/* 右侧 1/3：社区热门趋势榜微件 (Trending Pulse) */}
      <div className="flex flex-col rounded-3xl border border-separator-border/80 bg-background-primary-default p-5 shadow-card lg:col-span-4">
        <div className="flex items-center justify-between pb-2.5 border-b border-separator-border/50">
          <div className="flex items-center gap-1.5 text-caption-1-medium font-semibold text-text-primary">
            <RiFireFill className="size-4 text-rose-500" />
            <span>热门能力榜 (Trending)</span>
          </div>
          <span className="text-[11px] font-mono text-text-tertiary">Top Installs</span>
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
                ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40 font-bold"
                : rank === 2
                  ? "bg-slate-400/20 text-slate-700 dark:text-slate-300 border-slate-400/40 font-bold"
                  : rank === 3
                    ? "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/40 font-bold"
                    : "bg-background-secondary-default text-text-tertiary border-separator-border/60"

            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-2.5 gap-2.5 hover:bg-background-secondary-default/30 px-1 -mx-1 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={cx(
                      "flex size-5.5 shrink-0 items-center justify-center rounded-lg border text-[11px] font-mono shadow-2xs",
                      rankBadgeStyle
                    )}
                  >
                    {rank}
                  </span>
                  <div className="min-w-0">
                    <h4 className="truncate text-caption-2-medium font-semibold text-text-primary">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[10.5px] text-text-tertiary">
                      <span>{item.stars?.toLocaleString()} ★</span>
                      <span>·</span>
                      <span>{item.skillCount} 项</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {isInstalled ? (
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <RiCheckLine className="size-3" />
                      <span>已装</span>
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => onInstall(item)}
                      className="h-6.5 px-2 text-[11px] shadow-2xs"
                    >
                      <span>获取</span>
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 底部指标微件：增加状态感知与信赖背书 */}
        <div className="pt-2.5 border-t border-separator-border/40 flex items-center justify-between text-[10.5px] text-text-tertiary">
          <div className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>社区版本每周实时同步</span>
          </div>
          <span className="font-mono">100% 离线可用</span>
        </div>
      </div>
    </div>
  )
}
