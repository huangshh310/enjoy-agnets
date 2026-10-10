/**
 * 把工作区文件/目录读进 QuotedContext。读失败仍给出路径，禁止编造正文。
 */
import { getIde } from "@renderer/lib/ide"
import { readWorkspaceFile } from "@renderer/lib/read-workspace-file"
import type { MentionDirEntry } from "./collect-mention-files.ts"
import {
  quoteUnreadableFile,
  quoteWorkspaceFile,
  quoteWorkspaceFolder
} from "./file-mention-quote.ts"
import type { QuotedContext } from "@enjoy-agents/ipc-contract"

export async function attachWorkspaceMention(
  workspaceId: string,
  entry: MentionDirEntry
): Promise<QuotedContext> {
  if (entry.kind === "directory") return attachFolder(workspaceId, entry.path)
  return attachFile(workspaceId, entry.path)
}

async function attachFolder(workspaceId: string, path: string) {
  try {
    const rows = (await getIde().workspace.files({ workspaceId, path })) as MentionDirEntry[]
    const names = rows.map((row) => (row.kind === "directory" ? `${row.name}/` : row.name))
    return quoteWorkspaceFolder(path, names)
  } catch {
    return quoteUnreadableFile(path, "unreadable")
  }
}

async function attachFile(workspaceId: string, path: string) {
  try {
    const text = await readWorkspaceFile(workspaceId, path)
    if (text.includes("\0")) return quoteUnreadableFile(path, "binary")
    return quoteWorkspaceFile(path, text)
  } catch {
    return quoteUnreadableFile(path, "unreadable")
  }
}
