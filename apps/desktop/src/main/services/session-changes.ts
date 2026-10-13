/**
 * luna P2：会话级改动 = 本会话写盘 run 自首个写盘 run 开始时基线以来改过的文件。
 * 基线 = 会话首个 run 开始时已脏文件的内容哈希（run_start_dirty）。只比内容，不看 HEAD：
 * run_start_git_heads 里的 HEAD 只给收工降级判定用，这里不读（本会话提交过的文件不再算「已改」）。
 * 跑前就脏、内容没变的文件不算本会话的；没有写盘 run = 0。
 */
import { spawnSync } from "node:child_process"
import { isReadOnlyBashTool } from "@enjoy-agents/ipc-contract/bash-read-only"
import { isWriteTypeToolName } from "@enjoy-agents/ipc-contract/tool-names"
import type { SessionChangesResult } from "@enjoy-agents/ipc-contract/session-changes"
import { parseAssistantPayload } from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./database"

/** path → 内容哈希（删除记 "<deleted>"）。null = 不是 git / git 失败。 */
export type DirtyProbe = (root: string) => Map<string, string> | null

export function gitDirtySnapshot(root: string): Map<string, string> | null {
  try {
    const status = spawnSync("git", ["-C", root, "status", "--porcelain=v1", "-z", "--untracked-files=all"], {
      encoding: "utf8",
      timeout: 5_000
    })
    if (status.status !== 0) return null
    const out = new Map<string, string>()
    const entries = status.stdout.split("\0").filter(Boolean)
    const paths: string[] = []
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i]
      const code = entry.slice(0, 2)
      paths.push(entry.slice(3))
      if (code.includes("R") || code.includes("C")) i += 1 // 重命名的原路径
    }
    if (paths.length === 0) return out
    const hashed = spawnSync("git", ["-C", root, "hash-object", "--stdin-paths"], {
      encoding: "utf8",
      input: paths.join("\n") + "\n",
      timeout: 10_000
    })
    const hashes = hashed.status === 0 ? hashed.stdout.split("\n") : []
    paths.forEach((path, idx) => out.set(path, hashes[idx]?.trim() || hashOne(root, path)))
    return out
  } catch {
    return null
  }
}

function hashOne(root: string, path: string): string {
  const one = spawnSync("git", ["-C", root, "hash-object", "--", path], { encoding: "utf8", timeout: 5_000 })
  return one.status === 0 ? one.stdout.trim() : "<deleted>"
}

function ensureDirtyTable(): void {
  getDatabase().exec(
    "CREATE TABLE IF NOT EXISTS run_start_dirty (run_id TEXT PRIMARY KEY, session_id TEXT NOT NULL, dirty_json TEXT, created_at INTEGER NOT NULL)"
  )
}

function workspaceRoot(sessionId: string): string | null {
  try {
    const row = getDatabase()
      .prepare("SELECT w.root_path as rootPath FROM sessions s JOIN workspaces w ON w.id = s.workspace_id WHERE s.id = ?")
      .get(sessionId) as { rootPath?: string } | undefined
    return row?.rootPath || null
  } catch {
    return null
  }
}

/** run 开始时记下已脏文件及其内容哈希（落库，重启后还在）。非 git 记 null。 */
export function recordRunStartDirty(runId: string, sessionId: string, probe: DirtyProbe = gitDirtySnapshot): void {
  try {
    ensureDirtyTable()
    const root = workspaceRoot(sessionId)
    const snap = root ? probe(root) : null
    getDatabase()
      .prepare("INSERT OR IGNORE INTO run_start_dirty (run_id, session_id, dirty_json, created_at) VALUES (?, ?, ?, ?)")
      .run(runId, sessionId, snap ? JSON.stringify(Object.fromEntries(snap)) : null, Date.now())
  } catch {
    // 记不下来 → 基线 unknown（fail-closed）
  }
}

type ToolPart = { type?: string; name?: string; args?: unknown }

function isWritingTool(part: ToolPart): boolean {
  const name = typeof part?.name === "string" ? part.name : ""
  if (!name) return true // 读不懂当写过（fail-closed：不归零）
  if (!isWriteTypeToolName(name)) return false
  return !isReadOnlyBashTool({ name, args: part.args })
}

/**
 * 本会话有没有写盘工具调用（写型且不是只读 bash）。
 * 两处都读：message_parts 的 tool 部件，以及助手消息正文信封里的 tools（强杀重启重写过的消息可能只剩信封）。
 */
export function sessionHasWritingRuns(sessionId: string): boolean {
  const db = getDatabase()
  const parts = db
    .prepare(
      "SELECT p.payload FROM message_parts p JOIN messages m ON m.id = p.message_id WHERE m.session_id = ? AND p.type = 'tool'"
    )
    .all(sessionId) as Array<{ payload: string }>
  for (const row of parts) {
    let part: ToolPart
    try {
      part = JSON.parse(row.payload) as ToolPart
    } catch {
      return true
    }
    if (isWritingTool(part)) return true
  }
  const bodies = db
    .prepare("SELECT content FROM messages WHERE session_id = ? AND role = 'assistant'")
    .all(sessionId) as Array<{ content: string }>
  for (const row of bodies) {
    let tools: unknown
    try {
      tools = parseAssistantPayload(row.content).tools
    } catch {
      return true
    }
    if (tools !== undefined && !Array.isArray(tools)) return true
    for (const tool of (tools ?? []) as ToolPart[]) if (isWritingTool(tool)) return true
  }
  return false
}

/** 本会话最早一次 run 开始时的脏文件快照。undefined = 没有（老 run / 记录失败）；null = 当时不是 git。 */
function sessionBaseline(sessionId: string): Map<string, string> | null | undefined {
  try {
    ensureDirtyTable()
    const row = getDatabase()
      .prepare("SELECT dirty_json FROM run_start_dirty WHERE session_id = ? ORDER BY created_at ASC, rowid ASC LIMIT 1")
      .get(sessionId) as { dirty_json: string | null } | undefined
    if (!row) return undefined
    if (row.dirty_json === null) return null
    return new Map(Object.entries(JSON.parse(row.dirty_json) as Record<string, string>))
  } catch {
    return undefined
  }
}

export function sessionChanges(sessionId: string, probe: DirtyProbe = gitDirtySnapshot): SessionChangesResult {
  const none = (baseline: SessionChangesResult["baseline"], hasWritingRuns: boolean): SessionChangesResult => ({
    sessionId,
    paths: [],
    sessionChangeCount: 0,
    hasWritingRuns,
    baseline
  })
  let writing: boolean
  try {
    writing = sessionHasWritingRuns(sessionId)
  } catch {
    return none("unknown", true)
  }
  if (!writing) return none("none", false)
  const baseline = sessionBaseline(sessionId)
  const root = workspaceRoot(sessionId)
  if (!baseline || !root) return none("unknown", true)
  const now = probe(root)
  if (!now) return none("unknown", true)
  const paths = [...now.entries()]
    .filter(([path, hash]) => baseline.get(path) !== hash)
    .map(([path]) => path)
    .sort()
  return { sessionId, paths, sessionChangeCount: paths.length, hasWritingRuns: true, baseline: "known" }
}
