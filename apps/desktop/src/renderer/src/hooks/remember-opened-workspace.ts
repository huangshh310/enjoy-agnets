/**
 * 打开 / 连接成功后立刻写入 workspaces query，避免启动对齐或设置页仍看到旧空名单。
 */
import { queryClient } from "../lib/query-client"
import type { WorkspaceRow } from "./workspace-row"

export function rememberOpenedWorkspace(workspace: WorkspaceRow) {
  queryClient.setQueryData<WorkspaceRow[]>(["workspaces"], (prev) => {
    const list = prev ?? []
    if (list.some((row) => row.id === workspace.id)) {
      return list.map((row) => (row.id === workspace.id ? { ...row, ...workspace } : row))
    }
    return [...list, workspace]
  })
}
