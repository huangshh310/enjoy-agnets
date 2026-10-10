/**
 * 设置 → MCP：正文内嵌 MCP 页，侧栏不换轨。要独立中心再点「打开 MCP 中心」。
 */
import { useNavigate } from "@tanstack/react-router"
import { McpPage } from "@renderer/components/mcp/mcp-page"
import { useT } from "@renderer/i18n"
import { SettingsHubEmbed } from "./settings-hub-embed"

export function McpSettings() {
  const t = useT()
  const navigate = useNavigate()
  return (
    <SettingsHubEmbed
      openLabel={t("settings.mcp.openHub")}
      onOpenHub={() => void navigate({ to: "/mcp", search: { from: "settings", section: "mcp" } })}
    >
      <McpPage embedded />
    </SettingsHubEmbed>
  )
}
