/**
 * Tool Chips 文件胶囊：从 Thinking 行抽出可打开的路径，命令不当文件。
 */

export type ChipSourceRow = {
  mono?: boolean
  add?: number
  del?: number
  secondary?: string
}

/** 命令行参数不要当成文件胶囊；只要路径或带扩展名的文件。 */
export function looksLikeFilePath(value: string): boolean {
  const path = value.trim()
  if (!path || /\s/.test(path)) return false
  return /[\\/]/.test(path) || /\.\w{1,12}$/.test(path)
}

/** 从编码步骤抽出 Tool Chips 底部的文件增减胶囊。 */
export function fileChangesFromRows(
  rows: ChipSourceRow[]
): Array<{ path: string; additions?: number; deletions?: number }> {
  const chips: Array<{ path: string; additions?: number; deletions?: number }> = []
  for (const row of rows) {
    if (!row.mono) continue
    if (row.add == null && row.del == null) continue
    const path = row.secondary?.trim()
    if (!path || !looksLikeFilePath(path)) continue
    chips.push({ path, additions: row.add, deletions: row.del })
  }
  return chips
}
