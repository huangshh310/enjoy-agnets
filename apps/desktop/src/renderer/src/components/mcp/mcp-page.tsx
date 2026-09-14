/**
 * MCP Server 与插件生态页面：已配置服务 / 本地预设 / JSON 规格。
 */
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { useT } from "@renderer/i18n"
import { McpAppModal } from "./components/mcp-app-modal"
import { McpCreateModal } from "./components/mcp-create-modal"
import { McpHeader } from "./components/mcp-header"
import { McpJsonEditorView } from "./components/mcp-json-editor-view"
import { McpServerToolsModal } from "./components/mcp-server-tools-modal"
import { McpServersView } from "./components/mcp-servers-view"
import { useMcpPage } from "./hooks/use-mcp-page"
import type { McpActiveTab } from "./types/mcp-ui.types"

export function McpPage(props?: {
  embedded?: boolean
  onBrowseMarketplace?: () => void
}) {
  const t = useT()
  const page = useMcpPage()

  const content = (
    <div className="flex h-full min-h-0 flex-col px-8 pt-5 pb-6">
      <McpHeader
        stats={page.stats}
        onAddClick={() => page.openCreateModal()}
        onRefresh={page.refresh}
        isRefreshing={page.isRefreshing}
      />

      <div className="flex min-h-0 flex-1 flex-col pt-5">
        {page.activeTab === "servers" ? (
          <McpServersView
            servers={page.servers}
            filteredServers={page.filteredServers}
            serverSearch={page.serverSearch}
            onServerSearchChange={page.setServerSearch}
            onChanged={page.refresh}
            onOpenApp={page.openApp}
            onExploreTools={(s) => page.setToolsModalServer(s)}
            onEdit={(s) => page.openCreateModal(s)}
            onAdd={() => page.openCreateModal()}
            onBrowseMarketplace={() => {
              if (props?.onBrowseMarketplace) {
                props.onBrowseMarketplace()
              } else {
                window.location.hash = "#/extensions"
              }
            }}
          />
        ) : null}

        {page.activeTab === "json" ? (
          <McpJsonEditorView servers={page.servers} onChanged={page.refresh} />
        ) : null}
      </div>

      <McpCreateModal
        open={page.createModalOpen}
        onOpenChange={page.setCreateModalOpen}
        initialServer={page.editingServer}
        onChanged={page.refresh}
      />

      <McpServerToolsModal
        server={page.toolsModalServer}
        open={Boolean(page.toolsModalServer)}
        onOpenChange={(open) => {
          if (!open) page.setToolsModalServer(null)
        }}
        onChanged={page.refresh}
      />

      <McpAppModal
        open={page.appModalOpen}
        onOpenChange={page.setAppModalOpen}
        appTitle={page.appTitle}
        appSrcDoc={page.appSrcDoc}
        lastLog={page.lastLog}
        onAppMessage={page.onAppMessage}
        onRefreshApp={() => {
          if (page.openServerId) void page.openApp(page.openServerId)
        }}
      />
    </div>
  )

  if (props?.embedded) {
    return content
  }

  return (
    <SecondaryPageShell
      searchPlaceholder={t("pages.mcp.filterPlaceholder")}
      groups={page.groups}
      selectedId={page.activeTab}
      onSelect={(id) => page.setActiveTab(id as McpActiveTab)}
      contentWidth="fill"
      hideChrome
    >
      {content}
    </SecondaryPageShell>
  )
}
