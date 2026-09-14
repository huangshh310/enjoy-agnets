/**
 * 助手轮内嵌 MCP App：ACP 工具结果里的 HTML 也走同一隔离 iframe。
 */
import { getIde, hasIde } from "@renderer/lib/ide"
import type { ThreadMcpApp } from "@renderer/stores/chat-store.types"
import { McpAppFrame } from "@renderer/components/mcp/mcp-app-frame"

export function TurnMcpApps({ apps }: { apps: ThreadMcpApp[] }) {
  if (apps.length === 0) return null
  return (
    <div className="mt-2 flex w-full flex-col gap-2">
      {apps.map((app) => (
        <McpAppFrame
          key={`${app.serverId}:${app.resourceUri}`}
          srcDoc={app.srcDoc}
          title={app.title}
          onAppMessage={app.serverId === "acp" ? undefined : (raw) => forwardAppMessage(app.serverId, raw)}
        />
      ))}
    </div>
  )
}

function forwardAppMessage(serverId: string, raw: unknown) {
  if (!hasIde()) return
  void getIde().mcp.appMessage({ id: serverId, message: raw })
}
