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

/** 展开审查栏：有 dirty 文件且还没开标签时直接进 Review。 */
export function expandInspector(kind?: RightPaneKind) {
  if (kind) {
    revealRightPane(kind)
    return
  }
  const tabs = useRightPaneStore.getState().tabs
  const dirty = useChatStore.getState().changes.length > 0
  if (tabs.length === 0 && dirty) {
    revealRightPane("review")
    return
  }
  useChatStore.getState().setRightPanelCollapsed(false)
}

export function openBrowserUrl(raw: string) {
  const url = parseHttpUrl(raw)
  if (!url) return
  revealRightPane("browser", { url })
}

export function openReviewCommits() {
  useChatStore.getState().setRightPanelCollapsed(false)
  useRightPaneStore.getState().openTool("review")
  useRightPaneStore.getState().setReviewScope("commits")
}
