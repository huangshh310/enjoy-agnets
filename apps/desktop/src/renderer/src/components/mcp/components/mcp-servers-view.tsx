/**
 * MCP 已配置服务列表：搜索、空态、卡片操作。
 */
import { RiAddLine, RiPlugLine, RiSearchLine, RiSparklingLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { McpServerCard } from "./mcp-server-card"

export function McpServersView(props: {
  servers: McpServer[]
  filteredServers: McpServer[]
  serverSearch: string
  onServerSearchChange: (value: string) => void
  onChanged: () => Promise<void>
  onOpenApp: (serverId: string) => Promise<void>
  onExploreTools: (server: McpServer) => void
  onEdit: (server: McpServer) => void
  onAdd: () => void
  onBrowseMarketplace: () => void
}) {
  const {
    servers,
    filteredServers,
    serverSearch,
    onServerSearchChange,
    onChanged,
    onOpenApp,
    onExploreTools,
    onEdit,
    onAdd,
    onBrowseMarketplace
  } = props
  const t = useT()

  const trustedCount = servers.filter((s) => s.trusted).length
  const untrustedCount = servers.length - trustedCount

  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-caption-1-medium font-semibold text-text-primary">
            {t("pages.mcp.registeredCount", { n: filteredServers.length })}
          </span>
          {servers.length > 0 ? (
            <span className="rounded-md border border-border-button-default/80 bg-background-secondary-default/50 px-2 py-0.5 font-mono text-[10.5px] text-text-tertiary">
              {t("pages.mcp.trustStats", { total: servers.length, trusted: trustedCount, untrusted: untrustedCount })}
            </span>
          ) : null}
        </div>
        {servers.length > 0 ? (
          <div className="relative w-56">
            <RiSearchLine className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
            <Input
              value={serverSearch}
              onChange={(e) => onServerSearchChange(e.target.value)}
              placeholder={t("pages.mcp.searchServers")}
              className="pl-8 h-7.5 text-caption-2-medium bg-background-primary-default"
            />
          </div>
        ) : null}
      </div>

      {servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-separator-border/80 bg-background-secondary-default/20 p-10 text-center">
          <div className="flex size-10 items-center justify-center rounded-lg bg-background-secondary-default text-text-tertiary mb-3">
            <RiPlugLine className="size-5" />
          </div>
          <h3 className="text-body-medium font-semibold text-text-primary">
            {t("pages.mcp.emptyTitle")}
          </h3>
          <p className="mt-1 max-w-sm text-caption-2-medium text-text-tertiary leading-relaxed">
            {t("pages.mcp.emptyHint")}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Button
              size="sm"
              onClick={onAdd}
              className="gap-1.5 h-7.5 text-caption-2-medium shadow-xs"
            >
              <RiAddLine className="size-3.5" />
              <span>{t("pages.mcp.registerServer")}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onBrowseMarketplace}
              className="gap-1.5 h-7.5 text-caption-2-medium"
            >
              <RiSparklingLine className="size-3.5 text-accent-500" />
              <span>{t("pages.mcp.browseMarketplace")}</span>
            </Button>
          </div>
        </div>
      ) : filteredServers.length === 0 ? (
        <div className="py-10 text-center text-caption-2-medium text-text-tertiary">
          {t("pages.mcp.noMatchingServers")}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredServers.map((server) => (
            <McpServerCard
              key={server.id}
              server={server}
              onChanged={onChanged}
              onOpenApp={onOpenApp}
              onExploreTools={onExploreTools}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </section>
  )
}
