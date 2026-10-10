/**
 * 侧栏列表标题：按项目仍写「项目」；扁平列表写「对话」。
 */
export type SidebarGrouping = "project" | "flat" | "status"

export function sidebarListHeadingKey(grouping: SidebarGrouping): "chat.projects" | "chat.chats" {
  return grouping === "flat" ? "chat.chats" : "chat.projects"
}
