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
            包含的技能清单 ({skills.length})
          </h4>
          <p className="text-[11px] text-text-tertiary">
            已勾选 {enabledCount} / {skills.length} 项能力同步至目标
          </p>
        </div>

        {/* 快速筛选标签 */}
        <div className="flex items-center gap-1 rounded-xl bg-background-secondary-default/60 p-0.5 border border-separator-border/50 text-[11px]">
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
            全部
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("enabled")}
            className={cx(
              "rounded-lg px-2 py-0.5 transition-colors cursor-pointer",
              filterMode === "enabled"
                ? "bg-background-primary-default text-emerald-600 font-medium shadow-2xs"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            已启用 ({enabledCount})
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
            停用
          </button>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <RiSearchLine className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`在 ${skills.length} 项技能中过滤名称或指令…`}
          className="pl-8 h-8 text-caption-2-medium bg-background-secondary-default/50"
        />
      </div>

      {/* 滚动列表 */}
      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-1">
        {filteredSkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-text-tertiary">
            <RiFilter3Line className="size-6 mb-1.5 opacity-50" />
            <p className="text-caption-2-regular">未找到匹配的技能项</p>
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
                    aria-label={`切换 ${skill.name}`}
                  >
                    {isSelected ? <RiCheckLine className="size-3.5" /> : null}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-caption-2-medium font-semibold text-text-primary">
                        {skill.name}
                      </span>
                      {trigger ? (
                        <span className="rounded bg-background-secondary-default/80 px-1.5 py-0.2 font-mono text-[9.5px] text-text-secondary border border-separator-border/50">
                          {trigger}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-[11px] text-text-tertiary">
                      {skill.description || skill.relativeDir}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={cx(
                      "text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md",
                      isSelected
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-background-secondary-default text-text-tertiary"
                    )}
                  >
                    {isSelected ? "已激活" : "已休眠"}
                  </span>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteSkill(skill.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 rounded-md p-1 text-text-tertiary hover:bg-rose-500/10 hover:text-rose-600 transition-opacity"
                    aria-label="删除技能"
                    title="从磁盘移除此技能"
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
