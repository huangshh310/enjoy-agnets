/**
 * 助手轮内嵌 MCP App：ACP 工具结果里的 HTML 也走同一隔离 iframe。
 * 超大 srcDoc 只留中性提示，不带字数、不挂 iframe。
 */
import { getIde, hasIde } from "@renderer/lib/ide"
import { mcpAppSurface } from "@renderer/lib/mcp-app-surface"
import { useT } from "@renderer/i18n"
import type { ThreadMcpApp } from "@renderer/stores/chat-store.types"
import { McpAppFrame } from "@renderer/components/mcp/mcp-app-frame"

export function TurnMcpApps({ apps }: { apps: ThreadMcpApp[] }) {
  const t = useT()
  if (apps.length === 0) return null
  return (
    <div className="mt-2 flex w-full flex-col gap-2">
      {apps.map((app) => {
        const surface = mcpAppSurface(app)
        if (surface.kind === "hidden") return null
        if (surface.kind === "too_large") {
          return (
            <p
              key={`${app.serverId}:${app.resourceUri}`}
              data-testid="mcp-app-too-large"
              className="rounded-2xl border border-border-button-default bg-background-secondary-default/40 px-3 py-2 text-caption-1-regular text-text-secondary"
            >
              {t("chat.mcpAppTooLarge")}
            </p>
          )
        }
        return (
          <McpAppFrame
            key={`${app.serverId}:${app.resourceUri}`}
            srcDoc={surface.srcDoc}
            title={surface.title}
            onAppMessage={app.serverId === "acp" ? undefined : (raw) => forwardAppMessage(app.serverId, raw)}
          />
        )
      })}
    </div>
  )
}

function forwardAppMessage(serverId: string, raw: unknown) {
  if (!hasIde()) return
  void getIde().mcp.appMessage({ id: serverId, message: raw })
}
