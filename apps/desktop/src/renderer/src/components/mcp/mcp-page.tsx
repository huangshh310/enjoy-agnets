/**
 * MCP Server 与插件生态页面：已配置服务 / 精选市场 / JSON 规格。
 */
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { McpAppModal } from "./components/mcp-app-modal"
import { McpCreateModal } from "./components/mcp-create-modal"
import { McpHeader } from "./components/mcp-header"
import { McpJsonEditorView } from "./components/mcp-json-editor-view"
import { McpServerToolsModal } from "./components/mcp-server-tools-modal"
import { McpServersView } from "./components/mcp-servers-view"
import { McpStoreSection } from "./components/mcp-store-section"
import { useMcpPage } from "./hooks/use-mcp-page"
import type { McpActiveTab } from "./types/mcp-ui.types"

export function McpPage() {
  const page = useMcpPage()

  return (
    <SecondaryPageShell
      searchPlaceholder="Filter MCP servers..."
      groups={page.groups}
      selectedId={page.activeTab}
      onSelect={(id) => page.setActiveTab(id as McpActiveTab)}
      contentWidth="wide"
    >
      <div className="flex flex-col gap-5 pb-8">
        <McpHeader
          stats={page.stats}
          onAddClick={() => page.openCreateModal()}
          onRefresh={page.refresh}
          isRefreshing={page.isRefreshing}
        />

        {page.activeTab === "servers" && (
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
            onBrowseMarketplace={() => page.setActiveTab("marketplace")}
          />
        )}

        {page.activeTab === "marketplace" && (
          <McpStoreSection
            servers={page.servers}
            onQuickConnect={page.handleQuickConnectPreset}
            onPrefill={page.handlePrefillPreset}
            isAdding={false}
          />
        )}

        {page.activeTab === "json" && (
          <McpJsonEditorView servers={page.servers} onChanged={page.refresh} />
        )}
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
    </SecondaryPageShell>
  )
}
