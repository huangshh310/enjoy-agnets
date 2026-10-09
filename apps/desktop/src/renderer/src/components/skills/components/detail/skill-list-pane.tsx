/**
 * 来源组技能清单面板 (Skill List Pane)。
 * 提供高密度搜索过滤、分类切换、触发词可视化与即插即用勾选。
 */
import { useMemo, useState } from "react"
import {
  RiCheckLine,
  RiDeleteBinLine,
  RiFilter3Line,
  RiSearchLine
} from "@remixicon/react"
import type { SkillSource, SkillSourceSkill } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"

export function SkillListPane({
  source,
  skills,
  activeSkillId,
  busy,
  onSelectSkill,
  onToggleSkill,
  onDeleteSkill
}: {
  source: SkillSource
  skills: SkillSourceSkill[]
  activeSkillId: string | null
  busy: boolean
  onSelectSkill: (id: string) => void
  onToggleSkill: (source: SkillSource, skillId: string) => void
  onDeleteSkill: (skillId: string) => void
}) {
  const t = useT()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMode, setFilterMode] = useState<"all" | "enabled" | "disabled">("all")

  // 技能列表过滤
  const filteredSkills = useMemo(() => {
    return skills.filter((skill) => {
      const isSelected = source.selectedSkillIds.includes(skill.id)
      if (filterMode === "enabled" && !isSelected) return false
      if (filterMode === "disabled" && isSelected) return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        skill.name.toLowerCase().includes(q) ||
        skill.description?.toLowerCase().includes(q) ||
        skill.trigger?.toLowerCase().includes(q)
      )
    })
  }, [skills, source.selectedSkillIds, filterMode, searchQuery])

  const enabledCount = skills.filter((s) => source.selectedSkillIds.includes(s.id)).length

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-separator-border/80 bg-background-primary-default p-4.5 shadow-2xs lg:col-span-5 h-[620px]">
      {/* 头部标题与统计 */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h4 className="text-caption-1-medium font-semibold text-text-primary">
            {t("pages.skills.listPane.listTitle", { n: skills.length })}
          </h4>
          <p className="text-caption-2-regular text-text-tertiary">
            {t("pages.skills.listPane.selectedSummary", { enabled: enabledCount, total: skills.length })}
          </p>
        </div>

        {/* 快速筛选标签 */}
        <div className="flex items-center gap-1 rounded-xl bg-background-secondary-default/60 p-0.5 border border-separator-border/50 text-caption-2-regular">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={cx(
              "rounded-lg px-2 py-0.5 transition-colors cursor-pointer",
              filterMode === "all"
                ? "bg-background-primary-default text-text-primary font-medium shadow-2xs"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            {t("pages.skills.listPane.filterAll")}
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("enabled")}
            className={cx(
              "rounded-lg px-2 py-0.5 transition-colors cursor-pointer",
              filterMode === "enabled"
                ? "bg-background-primary-default text-state-success-text font-medium shadow-2xs"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            {t("pages.skills.listPane.filterEnabled", { n: enabledCount })}
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("disabled")}
            className={cx(
              "rounded-lg px-2 py-0.5 transition-colors cursor-pointer",
              filterMode === "disabled"
                ? "bg-background-primary-default text-text-primary font-medium shadow-2xs"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            {t("pages.skills.listPane.filterDisabled")}
          </button>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <RiSearchLine className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("pages.skills.listPane.searchPlaceholder", { n: skills.length })}
          className="pl-8 h-8 text-caption-2-medium bg-background-secondary-default/50"
        />
      </div>

      {/* 滚动列表 */}
      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-1">
        {filteredSkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-text-tertiary">
            <RiFilter3Line className="size-6 mb-1.5 opacity-50" />
            <p className="text-caption-2-regular">{t("pages.skills.listPane.noMatch")}</p>
          </div>
        ) : (
          filteredSkills.map((skill) => {
            const isSelected = source.selectedSkillIds.includes(skill.id)
            const isActive = activeSkillId === skill.id
            const trigger = skill.trigger || (skill.name.includes(" ") ? undefined : `/${skill.name}`)

            return (
              <div
                key={skill.id}
                onClick={() => onSelectSkill(skill.id)}
                className={cx(
                  "group flex items-center justify-between gap-2.5 rounded-2xl p-2.5 transition-all cursor-pointer border",
                  isActive
                    ? "border-accent-500/50 bg-accent-500/5 shadow-2xs"
                    : "border-transparent hover:bg-background-secondary-default/50"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* 复选按钮 */}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleSkill(source, skill.id)
                    }}
                    className={cx(
                      "flex size-5 shrink-0 items-center justify-center rounded-lg border transition-all cursor-pointer",
                      isSelected
                        ? "border-accent-500 bg-accent-500 text-text-white shadow-xs"
                        : "border-separator-border/80 bg-background-primary-default hover:border-text-tertiary"
                    )}
                    aria-label={t("pages.skills.listPane.toggleAria", { name: skill.name })}
                  >
                    {isSelected ? <RiCheckLine className="size-3.5" /> : null}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-caption-2-medium font-semibold text-text-primary">
                        {skill.name}
                      </span>
                      {trigger ? (
                        <span className="rounded bg-background-secondary-default/80 px-1.5 py-0.2 font-mono text-caption-2-regular text-text-secondary border border-separator-border/50">
                          {trigger}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-caption-2-regular text-text-tertiary">
                      {skill.description || skill.relativeDir}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={cx(
                      "text-caption-2-medium font-mono font-medium px-1.5 py-0.5 rounded-md",
                      isSelected
                        ? "bg-state-success-text/10 text-state-success-text dark:text-state-success-text"
                        : "bg-background-secondary-default text-text-tertiary"
                    )}
                  >
                    {isSelected ? t("pages.skills.listPane.stateActive") : t("pages.skills.listPane.stateDormant")}
                  </span>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteSkill(skill.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 rounded-md p-1 text-text-tertiary hover:bg-background-tertiary-error/10 hover:text-text-error-primary transition-opacity"
                    aria-label={t("pages.skills.listPane.deleteAria")}
                    title={t("pages.skills.listPane.deleteTitle")}
                  >
                    <RiDeleteBinLine className="size-3.5" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
