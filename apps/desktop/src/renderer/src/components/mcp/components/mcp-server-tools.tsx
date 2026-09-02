/**
 * MCP 卡片底部工具计数与折叠列表。
 */
import { RiArrowDownSLine, RiArrowRightSLine, RiToolsLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"

export function McpServerTools({
  server,
  expanded,
  onToggle,
  onExplore
}: {
  server: McpServer
  expanded: boolean
  onToggle: () => void
  onExplore: () => void
}) {
  const t = useT()
  const tools = server.tools ?? []
  return (
    <>
      <div className="mt-2.5 flex items-center justify-between border-t border-separator-border/40 pt-2 text-caption-2-medium">
        <div className="flex items-center gap-3 text-text-tertiary">
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-1 text-caption-2-medium text-text-secondary hover:text-text-primary"
          >
            <RiToolsLine className="size-3 text-accent-500" />
            <span>{t("pages.mcp.toolsCount", { n: tools.length })}</span>
            {tools.length > 0 ? (
              expanded ? <RiArrowDownSLine className="size-3" /> : <RiArrowRightSLine className="size-3" />
            ) : null}
          </button>
          {server.allowedResourceUris.length > 0 ? (
            <span className="font-mono text-caption-2-regular">
              {t("pages.mcp.urisCount", { n: server.allowedResourceUris.length })}
            </span>
          ) : null}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onExplore}
          className="h-6 gap-1 px-2 text-caption-2-medium text-text-secondary hover:text-text-primary"
        >
          <span>{t("pages.mcp.toolsPermission")}</span>
          <RiArrowRightSLine className="size-3" />
        </Button>
      </div>
      {expanded && tools.length > 0 ? (
        <div className="mt-2.5 grid grid-cols-1 gap-1 rounded-lg border border-separator-border/60 bg-background-secondary-default/30 p-2.5 sm:grid-cols-2">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="flex items-center justify-between gap-2 rounded border border-separator-border/30 bg-background-primary-default px-2 py-1 text-caption-2-regular"
            >
              <span className="truncate font-mono text-text-primary">{tool.name}</span>
              <span className="max-w-[150px] truncate text-text-tertiary">
                {tool.description || t("pages.mcp.noDescription")}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </>
  )
}
