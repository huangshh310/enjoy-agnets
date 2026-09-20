/**
 * H 列已配置名：只读投影本机 SoT，不把精选卡冒充已装。
 */
import { RiSparklingLine } from "@remixicon/react"
import { McpIcon } from "@renderer/components/mcp/components/mcp-brand-icons.ts"

export function ExtensionsItem({ label, kind }: { label: string; kind?: "mcp" | "skills" }) {
  const isMcp = kind === "mcp"
  return (
    <li className="flex items-center gap-2 text-caption-2-regular text-text-secondary">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-background-secondary-default text-text-tertiary">
        {isMcp ? <McpIcon className="size-3" /> : <RiSparklingLine className="size-3" />}
      </span>
      <span className="truncate">{label}</span>
    </li>
  )
}
