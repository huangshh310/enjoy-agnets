/**
 * 把撤销路径分成已跟踪 / 未跟踪。纯函数，便于单测。
 */
export function partitionRestorePaths(
  requested: string[],
  rows: Array<{ path: string; status: string }>
): { tracked: string[]; untracked: string[] } {
  const byPath = new Map(rows.map((row) => [normalizeRel(row.path), row]))
  const tracked: string[] = []
  const untracked: string[] = []
  const seen: Record<string, true> = {}
  for (const raw of requested) {
    const path = normalizeRel(raw)
    if (!path || seen[path]) continue
    seen[path] = true
    const row = byPath.get(path) ?? matchSuffix(path, rows)
    if (!row) continue
    if (row.status === "untracked") untracked.push(row.path)
    else tracked.push(row.path)
  }
  return { tracked, untracked }
}

function normalizeRel(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").trim()
}

function matchSuffix(
  path: string,
  rows: Array<{ path: string; status: string }>
): { path: string; status: string } | undefined {
  return rows.find((row) => {
    const other = normalizeRel(row.path)
    return other.endsWith(`/${path}`) || path.endsWith(`/${other}`)
  })
}
