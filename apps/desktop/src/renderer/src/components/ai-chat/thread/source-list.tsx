/**
 * 本轮来源：底脚轻量芯片，点开「本轮来源」sheet。不上 citation 抽屉。
 */
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { SourceChips } from "./sources/source-chips"

export function SourceList({
  sources,
  tools
}: {
  sources: NonNullable<ThreadMessage["sources"]>
  tools?: ThreadMessage["tools"]
}) {
  return <SourceChips sources={sources} tools={tools} />
}
