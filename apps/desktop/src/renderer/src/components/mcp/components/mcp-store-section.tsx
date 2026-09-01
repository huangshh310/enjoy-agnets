/**
 * MCP 精选插件市场 (Marketplace)：
 * 采用专业 IDE 风格，提供精简分类过滤、搜索、核心特性展示与一键安装 / 预填配置能力。
 */
import { useState } from "react"
import {
  RiAddLine,
  RiCheckLine,
  RiExternalLinkLine,
  RiKey2Line,
  RiSearchLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { FEATURED_MCP_PRESETS, MCP_PLUGIN_CATEGORIES } from "../constants/mcp-presets"
import type { McpPluginCategory, McpPluginPreset } from "../types/mcp-ui.types"

export function McpStoreSection(props: {
  servers: McpServer[]
  onQuickConnect: (preset: McpPluginPreset) => Promise<void>
  onPrefill: (preset: McpPluginPreset) => void
  isAdding: boolean
}) {
  const { servers, onQuickConnect, onPrefill, isAdding } = props
  const [selectedCategory, setSelectedCategory] = useState<McpPluginCategory>("all")
  const [search, setSearch] = useState("")

  const filteredPresets = FEATURED_MCP_PRESETS.filter((item) => {
    const matchCategory = selectedCategory === "all" || item.category === selectedCategory
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.categoryLabel.toLowerCase().includes(search.toLowerCase())
    return matchCategory && matchSearch
  })

  return (
    <section className="flex flex-col gap-4">
      {/* 紧凑分类筛选栏与搜索 */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* 紧凑分类胶囊 */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {MCP_PLUGIN_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as McpPluginCategory)}
                className={cx(
                  "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-all shrink-0",
                  isSelected
                    ? "bg-background-secondary-default text-text-primary shadow-2xs font-semibold"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* 搜索框 */}
        <div className="relative w-full sm:w-56 shrink-0">
          <RiSearchLine className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索插件..."
            className="pl-8 h-7.5 text-caption-2-medium bg-background-primary-default"
          />
        </div>
      </div>

      {/* 插件卡片网格 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPresets.map((plugin) => {
          const Icon = plugin.icon
          const isConfigured = servers.some(
            (s) => s.name === plugin.id || s.name.toLowerCase() === plugin.name.toLowerCase()
          )

          return (
            <div
              key={plugin.id}
              className="group relative flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs transition-all hover:border-separator-border hover:shadow-xs"
            >
              <div>
                {/* 头部图标、标题与协议 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-separator-border/60 bg-background-secondary-default/50 text-text-primary">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-caption-1-medium font-semibold text-text-primary">
                        {plugin.name}
                      </h4>
                      <span className="text-[10px] font-mono text-text-tertiary">
                        {plugin.categoryLabel}
                      </span>
                    </div>
                  </div>

                  <span className="rounded px-1.5 py-0.5 text-[9px] font-mono uppercase bg-background-secondary-default text-text-secondary">
                    {plugin.transport}
                  </span>
                </div>

                {/* 描述 */}
                <p className="mt-2.5 text-[11.5px] text-text-secondary leading-relaxed line-clamp-2">
                  {plugin.description}
                </p>

                {/* 特性标签 */}
                <div className="mt-2.5 flex items-center gap-1 flex-wrap">
                  {plugin.features.slice(0, 3).map((feat, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-background-secondary-default/60 px-1.5 py-0.5 text-[9.5px] text-text-tertiary"
                    >
                      {feat}
                    </span>
                  ))}
                </div>

                {/* 环境变量提示 */}
                {plugin.envTemplates && plugin.envTemplates.length > 0 ? (
                  <div className="mt-2.5 flex items-center gap-1 rounded bg-amber-500/5 px-2 py-1 text-[10.5px] text-amber-600 dark:text-amber-400">
                    <RiKey2Line className="size-3 shrink-0" />
                    <span className="truncate">
                      配置: {plugin.envTemplates.map((t) => t.key).join(", ")}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* 底部命令与操作 */}
              <div className="mt-3.5 flex items-center justify-between border-t border-separator-border/40 pt-2.5 gap-2">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="font-mono text-[10px] text-text-tertiary truncate max-w-[120px]">
                    {plugin.command || plugin.url}
                  </span>
                  {plugin.docsUrl ? (
                    <a
                      href={plugin.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="官方文档"
                      className="text-text-tertiary hover:text-text-primary transition-colors p-0.5"
                    >
                      <RiExternalLinkLine className="size-3" />
                    </a>
                  ) : null}
                </div>

                <Button
                  size="sm"
                  variant={isConfigured ? "outline" : "default"}
                  disabled={isAdding}
                  onClick={() => {
                    if (isConfigured || plugin.envTemplates) {
                      onPrefill(plugin)
                    } else {
                      void onQuickConnect(plugin)
                    }
                  }}
                  className="gap-1 h-6.5 px-2 text-[11px] shrink-0"
                >
                  {isConfigured ? (
                    <>
                      <RiCheckLine className="size-3 text-emerald-500" />
                      <span>已配置</span>
                    </>
                  ) : (
                    <>
                      <RiAddLine className="size-3" />
                      <span>{plugin.envTemplates ? "配置" : "接入"}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
