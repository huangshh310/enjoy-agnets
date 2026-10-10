/**
 * 读工作区文件。缺 workspaceId 时不打 IPC，避免 Zod 拒收。
 */
import { getIde } from "./ide"

export class MissingWorkspaceIdError extends Error {
  constructor() {
    super("workspaceId required")
    this.name = "MissingWorkspaceIdError"
  }
}

/** 空串 / null / undefined 一律当缺失，禁止把 undefined 丢给 readFile。 */
export function requireWorkspaceId(workspaceId: string | null | undefined): string {
  const id = typeof workspaceId === "string" ? workspaceId.trim() : ""
  if (!id) throw new MissingWorkspaceIdError()
  return id
}

export async function readWorkspaceFile(
  workspaceId: string | null | undefined,
  path: string
): Promise<string> {
  const id = requireWorkspaceId(workspaceId)
  const res = await getIde().workspace.readFile({ workspaceId: id, path })
  return typeof res === "string" ? res : ""
}
