/**
 * 展开右栏并打开审查 / 浏览器。会话文件胶囊与对话链接走这里。
 */
import { parseHttpUrl } from "@renderer/lib/http-url"
import { useChatStore } from "@renderer/stores/chat-store"
import { useRightPaneStore } from "@renderer/stores/right-pane-store"
import type { RightPaneKind } from "./right-pane.types"

export function revealRightPane(
  kind: RightPaneKind,
  options?: { forceNew?: boolean; url?: string }
) {
  useChatStore.getState().setRightPanelCollapsed(false)
  useRightPaneStore.getState().openTool(kind, options)
}

export function openBrowserUrl(raw: string) {
  const url = parseHttpUrl(raw)
  if (!url) return
  revealRightPane("browser", { url })
}
