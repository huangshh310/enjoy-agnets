/**
 * Grok usage.json adapter。只接受 sessions/<group>/<id>/usage.json。
 */
import { readFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import type { CliUsageAdapter } from "./types.ts"
import { catalogEntry } from "../catalog.ts"
import { parseGrokUsageFile } from "../parsers/parse-grok.ts"
import { projectLabelFromCwd } from "../parsers/parse-usage.ts"

const CWD_FILE_MAX_BYTES = 4 * 1024

export function matchGrokUsageRelPath(relPath: string): boolean {
  const parts = relPath.replaceAll("\\", "/").split("/").filter(Boolean)
  if (parts.some((part) => part === "subagents")) return false
  return parts.length === 3 && parts[2] === "usage.json"
}

export const grokAdapter: CliUsageAdapter = {
  id: "grok",
  roots: (home) => catalogEntry("grok").roots(home),
  matchRelPath: matchGrokUsageRelPath,
  parse: (text, ctx) => {
    const delta = parseGrokUsageFile(text)
    if (!delta) return null
    return { ...delta, project: projectFromGrokFile(ctx.filePath) }
  }
}

/** decode 失败或残留百分号编码则省略 project。单段 slug 合法。 */
export function projectFromEncodedGroup(group: string): string | undefined {
  let decoded: string
  try {
    decoded = decodeURIComponent(group)
  } catch {
    return undefined
  }
  if (/%2F|%2f|%5C/i.test(decoded)) return undefined
  return projectLabelFromCwd(decoded) ?? (decoded.trim() || undefined)
}

function projectFromGrokFile(filePath: string): string | undefined {
  const sessionDir = dirname(filePath)
  const groupDir = dirname(sessionDir)
  const fromCwd = readCwdFile(join(groupDir, ".cwd"))
  if (fromCwd) return fromCwd
  const parts = filePath.replaceAll("\\", "/").split("/").filter(Boolean)
  const usageIndex = parts.lastIndexOf("usage.json")
  const group = usageIndex >= 2 ? parts[usageIndex - 2] : undefined
  return group ? projectFromEncodedGroup(group) : undefined
}

function readCwdFile(path: string): string | undefined {
  try {
    const size = statSync(path).size
    if (size <= 0 || size > CWD_FILE_MAX_BYTES) return undefined
    const line = readFileSync(path, "utf8").split("\n")[0]?.trim()
    return projectLabelFromCwd(line)
  } catch {
    return undefined
  }
}
