/**
 * 右栏标签纯更新：同 kind 复用，浏览器可写入 url。
 */
import type { RightPaneKind, RightPaneTab } from "./right-pane.types"

export function openToolState(
  tabs: RightPaneTab[],
  kind: RightPaneKind,
  options: { forceNew?: boolean; url?: string } | undefined,
  newId: string
): { tabs: RightPaneTab[]; activeId: string } {
  const existing = options?.forceNew ? undefined : tabs.find((tab) => tab.kind === kind)
  if (existing) {
    return { tabs: patchTabUrl(tabs, existing.id, kind, options?.url), activeId: existing.id }
  }
  const tab: RightPaneTab = {
    id: newId,
    kind,
    ...(kind === "browser" && options?.url ? { url: options.url } : {})
  }
  return { tabs: [...tabs, tab], activeId: tab.id }
}

function patchTabUrl(
  tabs: RightPaneTab[],
  id: string,
  kind: RightPaneKind,
  url: string | undefined
): RightPaneTab[] {
  if (kind !== "browser" || url == null) return tabs
  return tabs.map((tab) => (tab.id === id ? { ...tab, url } : tab))
}
