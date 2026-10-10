/**
 * MCP 页面顶部标题与工具栏：
 * 采用克制、清爽的桌面 IDE 风格，整合状态指标与核心快捷操作。
 */
import {
  RiAddLine,
  RiRefreshLine,
  RiShieldCheckLine,
  RiToolsLine
} from "@remixicon/react"
import { McpIcon } from "./mcp-brand-icons.ts"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { McpOverviewStats } from "../types/mcp-ui.types"

export function McpHeader(props: {
  stats: McpOverviewStats
  onAddClick: () => void
  onRefresh: () => Promise<void>
  isRefreshing: boolean
}) {
  const { stats, onAddClick, onRefresh, isRefreshing } = props
  const t = useT()

  return (
    <header className="flex shrink-0 flex-col gap-3 pb-2 border-b border-separator-border/70">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* 左侧标题与内联状态 */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 data-testid="page-mcp" className="text-title-3-semibold text-text-primary tracking-tight">
              {t("pages.mcp.title")}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-md border border-state-success-text/25 bg-state-success-text/10 px-2 py-0.5 text-caption-2-medium font-medium text-state-success-text dark:text-state-success-text">
              <span className="size-1.5 rounded-full bg-state-success-base" />
              {t("pages.mcp.sandboxed")}
            </span>
          </div>
          <p className="text-caption-2-medium text-text-secondary">
            {t("pages.mcp.subtitle")}
          </p>
        </div>

        {/* 右侧快捷动作与精简指标 */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* 精简状态胶囊组 */}
          <div className="hidden lg:flex items-center gap-3 rounded-lg border border-separator-border/60 bg-background-secondary-default/40 px-3 py-1 text-caption-2-regular text-text-secondary mr-1 font-mono">
            <span className="flex items-center gap-1.5">
              <McpIcon className="size-3 text-state-success-text" />
              <span className="text-text-primary font-semibold">{stats.connected}</span>
              <span className="text-text-tertiary">{t("pages.mcp.runningOf", { total: stats.total })}</span>
            </span>
            <span className="h-3 w-px bg-separator-border" />
            <span className="flex items-center gap-1.5">
              <RiToolsLine className="size-3 text-accent-500" />
              <span className="text-text-primary font-semibold">{stats.totalTools}</span>
              <span className="text-text-tertiary">{t("pages.mcp.toolsLabel")}</span>
            </span>
            <span className="h-3 w-px bg-separator-border" />
            <span className="flex items-center gap-1.5">
              <RiShieldCheckLine className="size-3 text-chart-5" />
              <span className="text-text-primary font-semibold">{stats.trusted}</span>
              <span className="text-text-tertiary">{t("pages.mcp.trustedCount")}</span>
            </span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => void onRefresh()}
            disabled={isRefreshing}
            className="gap-1.5 h-8 text-caption-2-medium"
            title={t("pages.mcp.refreshTitle")}
          >
            <RiRefreshLine className={cx("size-3.5", isRefreshing && "animate-spin")} />
            <span>{t("pages.mcp.refresh")}</span>
          </Button>

          <Button
            size="sm"
            data-testid="mcp-add-server"
            onClick={onAddClick}
            className="gap-1.5 h-8 text-caption-2-medium shadow-xs"
          >
            <RiAddLine className="size-3.5" />
            <span>{t("pages.mcp.registerServer")}</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
