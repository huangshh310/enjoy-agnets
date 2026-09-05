/**
 * 技能中心顶部导航与工具栏：三模式分栏（集市 / 全部能力库 / 技能包合集）、全局快速搜索与极简操作入口。
 */
import {
  RiAddLine,
  RiCompass3Line,
  RiFolderLine,
  RiMoreFill,
  RiRefreshLine,
  RiSearchLine,
  RiSparklingLine,
  RiStethoscopeLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cx } from "@/utils/cx"
import { SKILLS_UI_COPY } from "../constants/skills-ui.constants"

export function SkillsToolbar({
  sourceCount,
  deployedCount,
  driftCount,
  warningCount,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  busy,
  onDoctor,
  onUpdateAll,
  onImport,
  onCreateSkill
}: {
  sourceCount: number
  deployedCount: number
  driftCount: number
  warningCount: number
  activeTab: "curated" | "skills" | "packs"
  onTabChange: (tab: "curated" | "skills" | "packs") => void
  searchQuery: string
  onSearchChange: (query: string) => void
  busy: boolean
  onDoctor: () => void
  onUpdateAll: () => void
  onImport: () => void
  onCreateSkill: () => void
}) {
  const hasIssues = driftCount > 0 || warningCount > 0

  return (
    <header className="flex flex-col gap-4 border-b border-separator-border/60 pb-4">
      {/* 顶栏：标题 + 状态微标 + 右侧控制操作 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-title-3-semibold text-text-primary tracking-tight">
              {SKILLS_UI_COPY.moduleTitle}
            </h1>
            <span
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-caption-2-medium transition-colors",
                hasIssues
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              )}
            >
              <span
                className={cx(
                  "size-1.5 rounded-full",
                  hasIssues ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                )}
              />
              {hasIssues
                ? `${driftCount} 处需同步`
                : `${deployedCount > 0 ? `${deployedCount} 项能力已就绪` : "状态就绪"}`}
            </span>
          </div>
          <p className="text-caption-2-regular text-text-tertiary">
            为你的 AI 助手装备专业代码审查、UI 设计、文案创作等即插即用的领域超能力。
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* 实时搜索 */}
          <div className="relative w-48 sm:w-60">
            <RiSearchLine className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索技能名称或触发词…"
              className="pl-8 h-8 text-caption-2-medium bg-background-primary-default"
            />
          </div>

          <Button
            size="sm"
            onClick={onCreateSkill}
            className="gap-1.5 h-8 px-3.5 text-caption-2-medium shadow-xs"
          >
            <RiAddLine className="size-3.5" />
            <span>新建技能</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onImport}
            className="gap-1.5 h-8 px-3 text-caption-2-medium"
          >
            <RiFolderLine className="size-3.5 text-text-tertiary" />
            <span>导入来源</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="size-8 p-0 text-text-tertiary hover:text-text-primary"
              >
                <RiMoreFill className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onDoctor} className="gap-2">
                <RiStethoscopeLine className="size-3.5 text-accent-500" />
                <span>Doctor 状态诊断</span>
              </DropdownMenuItem>
              {sourceCount > 0 ? (
                <DropdownMenuItem onClick={onUpdateAll} disabled={busy} className="gap-2">
                  <RiRefreshLine className={cx("size-3.5", busy && "animate-spin")} />
                  <span>拉取全量更新</span>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 视图三栏切换控制器 (Segmented Tab) */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1 rounded-xl bg-background-secondary-default/70 p-1 border border-separator-border/40">
          <button
            type="button"
            onClick={() => onTabChange("curated")}
            className={cx(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption-2-medium font-medium transition-all cursor-pointer",
              activeTab === "curated"
                ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            <RiCompass3Line className="size-3.5" />
            <span>精选集市</span>
            <span className="rounded-full bg-accent-500/10 px-1.5 py-0.2 text-[10px] text-accent-600 dark:text-accent-400 font-mono">
              Store
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("skills")}
            className={cx(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption-2-medium font-medium transition-all cursor-pointer",
              activeTab === "skills"
                ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            <RiSparklingLine className="size-3.5" />
            <span>全部能力库</span>
            <span className="rounded-full bg-background-secondary-default px-1.5 py-0.2 text-[10px] text-text-secondary font-mono">
              {deployedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("packs")}
            className={cx(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption-2-medium font-medium transition-all cursor-pointer",
              activeTab === "packs"
                ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            <RiFolderLine className="size-3.5" />
            <span>技能包合集</span>
            <span className="rounded-full bg-background-secondary-default px-1.5 py-0.2 text-[10px] text-text-secondary font-mono">
              {sourceCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
