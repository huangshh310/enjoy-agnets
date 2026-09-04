/**
 * 社区精选技能工作流库探索页。
 */
import { useMemo, useState } from "react"
import {
  RiCheckLine,
  RiCompass3Line,
  RiDownloadLine,
  RiLoader4Line,
  RiSearchLine,
  RiStarLine
} from "@remixicon/react"
import type { CuratedSkillSource, SkillSource } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import { SKILLS_UI_COPY } from "../constants/skills-ui.constants"

const CATEGORIES = [
  { id: "all", label: "全部精选" },
  { id: "engineering", label: "工程与开发" },
  { id: "design", label: "UI / 交互设计" },
  { id: "content", label: "内容与写作" },
  { id: "utility", label: "基础工具" }
] as const

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
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [search, setSearch] = useState("")

  const installedOrigins = useMemo(() => {
    const keys = new Set<string>()
    for (const source of sources) {
      keys.add(source.origin.toLowerCase())
      keys.add(source.id.toLowerCase())
      keys.add(source.name.toLowerCase())
    }
    return keys
  }, [sources])

  const filtered = useMemo(() => {
    return curated.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        item.name.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.featuredSkills.some((s) => s.toLowerCase().includes(q))
      )
    })
  }, [curated, selectedCategory, search])

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 pb-3 border-b border-separator-border/60">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
            <RiCompass3Line className="size-4" />
          </div>
          <div>
            <h2 className="text-title-3-semibold text-text-primary">
              {SKILLS_UI_COPY.exploreCurated}
            </h2>
            <p className="text-caption-2-regular text-text-tertiary">
              按需导入高质量社区 Agent 技能组，统一管理并投影到 Claude、Cursor、Codex 等。
            </p>
          </div>
        </div>

        {/* 分类过滤与搜索 */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cx(
                  "rounded-lg px-2.5 py-1 text-caption-2-medium transition-colors cursor-pointer",
                  selectedCategory === cat.id
                    ? "bg-accent-500/10 text-accent-600 dark:text-accent-400 font-semibold"
                    : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-64">
            <RiSearchLine className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索技能库与工具…"
              className="pl-8 h-8 text-caption-2-medium bg-background-primary-default"
            />
          </div>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-caption-2-medium text-text-tertiary">
          未找到匹配的精选工作流库
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const locator = item.locator.toLowerCase()
            const isInstalled =
              installedOrigins.has(locator) ||
              installedOrigins.has(item.id.toLowerCase()) ||
              installedOrigins.has(item.name.toLowerCase()) ||
              installedOrigins.has(`https://github.com/${locator}.git`)

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs transition-all hover:border-separator-border hover:shadow-card"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-caption-1-medium font-semibold text-text-primary">
                        {item.title}
                      </h3>
                      <span className="text-[11px] font-mono text-text-tertiary">
                        {item.name}
                      </span>
                    </div>
                    {item.stars ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-amber-600 dark:text-amber-400 shrink-0">
                        <RiStarLine className="size-3" />
                        {item.stars.toLocaleString()}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-[11.5px] text-text-secondary leading-relaxed line-clamp-3">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {item.featuredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-md bg-background-secondary-default px-1.5 py-0.5 text-[10px] font-mono text-text-secondary"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-separator-border/40 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-text-tertiary">
                    {item.skillCount} 个技能
                  </span>

                  {isInstalled ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <RiCheckLine className="size-3.5" />
                      <span>{SKILLS_UI_COPY.installedTag}</span>
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => onInstall(item)}
                      className="gap-1 h-7 text-[11px] font-medium"
                    >
                      {busy ? (
                        <RiLoader4Line className="size-3 animate-spin" />
                      ) : (
                        <RiDownloadLine className="size-3" />
                      )}
                      <span>{busy ? "导入中…" : SKILLS_UI_COPY.oneClickInstall}</span>
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
