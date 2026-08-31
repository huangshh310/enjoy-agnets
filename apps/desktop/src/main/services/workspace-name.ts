/**
 * 工作区显示名：显式名称优先，否则用路径最后一段。
 */
import { basename } from "node:path"

export function resolveWorkspaceName(rootPath: string, name?: string): string {
  const trimmed = name?.trim()
  return trimmed || basename(rootPath)
}
