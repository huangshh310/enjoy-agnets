/**
 * 原生选择器 → 工作区相对路径。根外路径返回 null。
 */
import { getIde } from "@renderer/lib/ide"
import { toWorkspaceRelativePath } from "./knowledge-workspace-path"

export async function pickWorkspaceRelativePath(
  workspaceId: string,
  kind: "folder" | "file"
): Promise<string | null> {
  const picked =
    kind === "folder"
      ? ((await getIde().workspace.pickFolder()) as { path: string } | undefined)
      : ((await getIde().workspace.pickFile()) as { path: string } | undefined)
  if (!picked?.path) return null
  const list = (await getIde().workspace.list()) as Array<{ id: string; rootPath: string }>
  const current = list.find((workspace) => workspace.id === workspaceId)
  if (!current) return null
  return toWorkspaceRelativePath(current.rootPath, picked.path)
}
