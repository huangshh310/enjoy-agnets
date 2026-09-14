/**
 * 扩展生态 Bento 卡片：
 * 品牌/分类图标、类型与就绪徽章、能力亮点 Chips、直达获取与配置操作。
 */
import {
  RiArrowRightLine,
  RiCheckLine,
  RiCpuLine,
  RiDownload2Line,
  RiFlashlightLine,
  RiStarLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { ExtensionCuratedCard } from "./extensions.types.ts"

export function ExtensionCard({ card }: { card: ExtensionCuratedCard }) {
  const t = useT()
  const FallbackIcon = card.kind === "mcp" ? RiCpuLine : RiFlashlightLine
  const Icon = card.icon ?? FallbackIcon

  return (
    <article className="group relative flex flex-col justify-between rounded-2xl border border-separator-border/80 bg-background-primary-default p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-500/40 hover:shadow-card-hover">
      <div>
        {/* 顶部栏：图标 + 类型徽章 + 状态 */}
        <div className="flex items-start justify-between gap-3">
          <div
            className={cx(
              "flex size-11 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-105",
              card.colorClass ||
                (card.kind === "mcp"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20")
            )}
          >
            <Icon className="size-5.5" />
          </div>

          <div className="flex items-center gap-1.5">
            {/* 类型标 */}
            <span
              className={cx(
                "rounded-md px-2 py-0.5 font-mono text-[10px] font-medium",
                card.kind === "mcp"
                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                  : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
              )}
            >
              {card.kind === "mcp" ? "MCP 服务" : "技能套件"}
            </span>

            {/* 就绪/推荐状态 */}
            {card.isConfigured ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <RiCheckLine className="size-3" />
                <span>{t("settings.extensions.statusConfigured")}</span>
              </span>
            ) : (
              <span className="rounded-md bg-background-secondary-default px-2 py-0.5 text-[10px] font-medium text-text-tertiary">
                {t("settings.extensions.statusCurated")}
              </span>
            )}
          </div>
        </div>

        {/* 标题与副标 */}
        <div className="mt-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate text-body-large-semibold text-text-primary group-hover:text-accent-500 transition-colors">
              {card.title}
            </h3>
            {card.stars ? (
              <span className="inline-flex items-center gap-0.5 font-mono text-[11px] text-text-tertiary">
                <RiStarLine className="size-3 text-amber-500 fill-amber-500" />
                <span>{card.stars >= 1000 ? `${(card.stars / 1000).toFixed(1)}k` : card.stars}</span>
              </span>
            ) : null}
          </div>

          {card.author ? (
            <span className="mt-0.5 block font-mono text-[11px] text-text-tertiary">{card.author}</span>
          ) : null}

          <p className="mt-2 line-clamp-2 text-caption-1-regular leading-relaxed text-text-secondary">
            {card.description}
          </p>
        </div>

        {/* 能力亮点 Chips (Sample Tools / Featured Skills) */}
        {card.sampleTools && card.sampleTools.length > 0 ? (
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 pt-3 border-t border-separator-border/50">
            {card.sampleTools.slice(0, 3).map((tool) => (
              <span
                key={tool}
                className={cx(
                  "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium transition-colors",
                  card.badgeColorClass
                    ? `${card.badgeColorClass} border-current/20`
                    : card.kind === "mcp"
                      ? "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                      : "border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                )}
              >
                {card.kind === "skills" ? <span className="opacity-50 mr-0.5 font-semibold">/</span> : null}
                {tool}
              </span>
            ))}
            {card.sampleTools.length > 3 ? (
              <span className="inline-flex items-center rounded-md border border-separator-border/60 bg-background-secondary-default px-1.5 py-0.5 font-mono text-[10px] font-medium text-text-secondary">
                +{card.sampleTools.length - 3}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 底部操作条 */}
      <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
        <span className="text-[11px] text-text-tertiary">
          {card.categoryLabel || card.category ? `#${card.categoryLabel || card.category}` : "即插即用"}
        </span>

        <a
          href={card.href}
          className={cx(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption-2-medium font-semibold transition-all cursor-pointer",
            card.isConfigured
              ? "border border-border-button-default bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
              : "bg-accent-500 text-white hover:bg-accent-600 shadow-xs active:scale-98"
          )}
        >
          {card.isConfigured ? (
            <>
              <span>{t("settings.extensions.actionManage")}</span>
              <RiArrowRightLine className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </>
          ) : (
            <>
              <RiDownload2Line className="size-3.5" />
              <span>{t("settings.extensions.actionGet")}</span>
            </>
          )}
        </a>
      </div>
    </article>
  )
}
