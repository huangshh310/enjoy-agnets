/**
 * 原生选择器 → 工作区相对路径。取消与根外要分开，禁止静默失败。
 */
import { getIde } from "@renderer/lib/ide"
import { pickedPathToRelative, type PickedRelative } from "./knowledge-workspace-path"

export async function pickWorkspaceRelativePath(
  workspaceId: string,
  kind: "folder" | "file"
): Promise<PickedRelative> {
  try {
    const picked =
      kind === "folder"
        ? ((await getIde().workspace.pickFolder()) as { path: string } | undefined)
        : ((await getIde().workspace.pickFile()) as { path: string } | undefined)
    const list = (await getIde().workspace.list()) as Array<{ id: string; rootPath: string }>
    const current = list.find((workspace) => workspace.id === workspaceId)
    if (!current) return { status: "cancel" }
    return pickedPathToRelative(current.rootPath, picked?.path)
  } catch {
    return { status: "cancel" }
  }
}
