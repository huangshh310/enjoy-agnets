/**
 * 侧栏「新对话」：有项目才建会话；无项目回到空态，禁止替用户弹选夹窗。
 */
export function planNewSession(workspaceId: string | null | undefined): "create" | "empty_home" {
  return workspaceId ? "create" : "empty_home"
}
