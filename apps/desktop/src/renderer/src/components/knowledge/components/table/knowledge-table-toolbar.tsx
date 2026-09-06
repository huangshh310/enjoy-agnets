/**
 * 知识索引表工具栏：文档/来源切换、搜索、排序、视图。
 */
import {
  RiArrowUpDownLine,
  RiFileTextLine,
  RiFolder6Line,
  RiLayoutGridLine,
  RiListUnordered,
  RiSearchLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { KnowledgeSortField, KnowledgeTabMode, KnowledgeViewMode } from "../../knowledge-table.types"

export function KnowledgeTableToolbar(props: {
  tabMode: KnowledgeTabMode
  documentsCount: number
  sourcesCount: number
  searchQuery: string
  sortField: KnowledgeSortField
  viewMode: KnowledgeViewMode
  onTabChange: (tab: KnowledgeTabMode) => void
  onSearchChange: (value: string) => void
  onSortChange: (field: KnowledgeSortField) => void
  onViewModeChange: (mode: KnowledgeViewMode) => void
}) {
  const t = useT()
  return (
    <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center rounded-xl border border-border-button-default bg-background-secondary-default p-0.5">
        <TabButton
          active={props.tabMode === "documents"}
          icon={RiFileTextLine}
          label={t("pages.knowledge.allIndexedFiles")}
          count={props.documentsCount}
          onClick={() => props.onTabChange("documents")}
        />
        <TabButton
          active={props.tabMode === "sources"}
          icon={RiFolder6Line}
          label={t("pages.knowledge.collections")}
          count={props.sourcesCount}
          onClick={() => props.onTabChange("sources")}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-44 sm:w-56">
          <RiSearchLine className="absolute left-2.5 top-2 size-3.5 text-text-tertiary" />
          <Input
            value={props.searchQuery}
            onChange={(event) => props.onSearchChange(event.target.value)}
            placeholder={t("pages.knowledge.searchFilePath")}
            className="h-8 bg-background-secondary-default pl-8 text-caption-1-medium"
          />
        </div>
        <SortMenu sortField={props.sortField} onSortChange={props.onSortChange} />
        <ViewModeSwitch viewMode={props.viewMode} onViewModeChange={props.onViewModeChange} />
      </div>
    </div>
  )
}

function TabButton(props: {
  active: boolean
  icon: typeof RiFileTextLine
  label: string
  count: number
  onClick: () => void
}) {
  const Icon = props.icon
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cx(
        "flex items-center gap-1.5 rounded-lg px-3 py-1 text-caption-1-medium",
        props.active ? "bg-background-primary-default text-text-primary shadow-xs" : "text-text-tertiary"
      )}
    >
      <Icon className="size-3.5" />
      <span>{props.label}</span>
      <span className="rounded-full bg-accent-500/10 px-1.5 text-caption-2-medium text-accent-500">
        {props.count}
      </span>
    </button>
  )
}

function SortMenu(props: {
  sortField: KnowledgeSortField
  onSortChange: (field: KnowledgeSortField) => void
}) {
  const t = useT()
  const label =
    props.sortField === "updated"
      ? t("pages.knowledge.sortUpdated")
      : props.sortField === "name"
        ? t("pages.knowledge.sortName")
        : t("pages.knowledge.sortChunks")
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1.5">
          <RiArrowUpDownLine className="size-3.5 text-text-tertiary" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => props.onSortChange("updated")}>
          {t("pages.knowledge.sortUpdated")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => props.onSortChange("name")}>{t("pages.knowledge.sortName")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => props.onSortChange("chunks")}>
          {t("pages.knowledge.sortChunks")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ViewModeSwitch(props: {
  viewMode: KnowledgeViewMode
  onViewModeChange: (mode: KnowledgeViewMode) => void
}) {
  const t = useT()
  return (
    <div className="flex items-center rounded-xl border border-border-button-default bg-background-secondary-default p-0.5">
      <button
        type="button"
        title={t("pages.knowledge.tableView")}
        onClick={() => props.onViewModeChange("table")}
        className={cx(
          "rounded-lg p-1.5",
          props.viewMode === "table" ? "bg-background-primary-default text-text-primary" : "text-text-tertiary"
        )}
      >
        <RiListUnordered className="size-3.5" />
      </button>
      <button
        type="button"
        title={t("pages.knowledge.gridView")}
        onClick={() => props.onViewModeChange("grid")}
        className={cx(
          "rounded-lg p-1.5",
          props.viewMode === "grid" ? "bg-background-primary-default text-text-primary" : "text-text-tertiary"
        )}
      >
        <RiLayoutGridLine className="size-3.5" />
      </button>
    </div>
  )
}
