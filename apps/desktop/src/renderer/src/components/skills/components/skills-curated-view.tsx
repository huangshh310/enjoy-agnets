/**
 * 精选技能集市 (Skill Store) 探索页：对标 Raycast Store / Figma Community。
 * 顶部非对称 Bento Spotlight 焦点台、高密度分类胶囊与即插即用获取体验。
 */
import { useMemo, useState } from "react"
import { RiCompass3Line } from "@remixicon/react"
import type { CuratedSkillSource, SkillSource } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"
import { STORE_CATEGORIES } from "../constants/skills-badge-theme"
import { CuratedBentoHero } from "./curated/curated-bento-hero"
import { CuratedGridCard } from "./curated/curated-grid-card"

export function SkillsCuratedView({
  curated,
  sources,
  busy,
  onInstall
}: {
  curated: CuratedSkillSource[]
  sources: SkillSource[]
  busy: boolean
  onInstall: (source: CuratedSkillSource) => void
}) {
  const t = useT()
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // 已安装的仓库来源集合
  const installedOrigins = useMemo(() => {
    const set = new Set<string>()
    for (const s of sources) {
      set.add(s.origin.toLowerCase())
      set.add(s.name.toLowerCase())
      set.add(s.id.toLowerCase())
    }
    return set
  }, [sources])

  // 按分类筛选
  const filtered = useMemo(() => {
    if (selectedCategory === "all") return curated
    return curated.filter((item) => item.category === selectedCategory)
  }, [curated, selectedCategory])

  // 聚光灯首选与榜单候选
  const spotlightItem = curated[0]
  const trendingItems = useMemo(() => curated.slice(1, 5), [curated])

  const isSpotlightInstalled = spotlightItem
    ? installedOrigins.has(spotlightItem.locator.toLowerCase()) ||
      installedOrigins.has(spotlightItem.name.toLowerCase())
    : false

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 1. 顶部非对称 Bento 聚光灯展台 (Spotlight + Trending Pulse) */}
      {spotlightItem && selectedCategory === "all" ? (
        <CuratedBentoHero
          spotlightItem={spotlightItem}
          trendingItems={trendingItems}
          isSpotlightInstalled={isSpotlightInstalled}
          installedOrigins={installedOrigins}
          busy={busy}
          onInstall={onInstall}
        />
      ) : null}

      {/* 2. 分类筛选标签胶囊 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-separator-border/40">
        {STORE_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id
          const CatIcon = cat.icon
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-caption-2-medium transition-all cursor-pointer border shrink-0",
                isActive
                  ? "border-accent-500/50 bg-accent-500/10 text-accent-700 dark:text-accent-300 font-semibold shadow-2xs"
                  : "border-separator-border/60 bg-background-primary-default text-text-secondary hover:border-separator-border hover:text-text-primary"
              )}
            >
              <CatIcon className="size-3.5" />
              <span>{cat.label}</span>
            </button>
          )
        })}
      </div>

      {/* 3. 技能套件卡片网格 */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <RiCompass3Line className="size-8 text-text-tertiary mb-2" />
          <p className="text-caption-1-medium text-text-secondary">{t("pages.skills.curatedView.emptyCategory")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const locator = item.locator.toLowerCase()
            const isInstalled =
              installedOrigins.has(locator) ||
              installedOrigins.has(item.id.toLowerCase()) ||
              installedOrigins.has(item.name.toLowerCase())

            return (
              <CuratedGridCard
                key={item.id}
                item={item}
                isInstalled={isInstalled}
                busy={busy}
                onInstall={onInstall}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
