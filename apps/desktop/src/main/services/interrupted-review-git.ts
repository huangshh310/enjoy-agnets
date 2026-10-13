/**
 * luna（#145 后续 B）：强杀后什么都没写盘，也不能把会话打进「待验收」。
 * 与 #148 胶囊同一 fail-closed 规则：只有 **git 确认** 工作区干净才降级；非 git / 读不到 / 有改动一律照旧（宁可多审）。
 */
import { spawnSync } from "node:child_process"
import { isAbsolute, relative, resolve, sep } from "node:path"
import type { TurnOutcome } from "@enjoy-agents/ipc-contract/turn-outcome"
import { getDatabase } from "./database"

export type GitCleanProbe = (root: string) => boolean | null

/** true=git 仓库且 `git status --porcelain` 为空；false=有改动；null=不是仓库 / git 失败（未确认）。 */
export function gitConfirmsClean(root: string): boolean | null {
  try {
    const inside = spawnSync("git", ["-C", root, "rev-parse", "--is-inside-work-tree"], {
      encoding: "utf8",
      timeout: 5_000
    })
    if (inside.status !== 0 || inside.stdout.trim() !== "true") return null
    const status = spawnSync("git", ["-C", root, "status", "--porcelain"], { encoding: "utf8", timeout: 5_000 })
    if (status.status !== 0) return null
    return status.stdout.trim() === ""
  } catch {
    return null
  }
}

function sessionWorkspaceRoot(sessionId: string): string | null {
  try {
    const row = getDatabase()
      .prepare(
        "SELECT w.root_path as rootPath FROM sessions s JOIN workspaces w ON w.id = s.workspace_id WHERE s.id = ?"
      )
      .get(sessionId) as { rootPath?: string } | undefined
    return row?.rootPath || null
  } catch {
    return null
  }
}

/** 当前 HEAD；不是仓库 / 空仓库 / git 失败 → null。 */
export function gitHead(root: string): string | null {
  try {
    const out = spawnSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8", timeout: 5_000 })
    return out.status === 0 ? out.stdout.trim() || null : null
  } catch {
    return null
  }
}

function ensureHeadTable(): void {
  getDatabase().exec("CREATE TABLE IF NOT EXISTS run_start_git_heads (run_id TEXT PRIMARY KEY, head TEXT)")
}

/** leo：run 开始时记下 HEAD（落库，强杀重启后还在）。非 git 记 null。 */
export function recordRunStartHead(runId: string, sessionId: string): void {
  try {
    const root = sessionWorkspaceRoot(sessionId)
    ensureHeadTable()
    getDatabase()
      .prepare("INSERT OR REPLACE INTO run_start_git_heads (run_id, head) VALUES (?, ?)")
      .run(runId, root ? gitHead(root) : null)
  } catch {
    // 记不下来 → 收工时视为未确认，照旧待验收
  }
}

/** undefined=没记录（未确认）；null=开始时不是 git；string=开始时的 HEAD。 */
function runStartHead(runId: string): string | null | undefined {
  try {
    ensureHeadTable()
    const row = getDatabase().prepare("SELECT head FROM run_start_git_heads WHERE run_id = ?").get(runId) as
      | { head: string | null }
      | undefined
    return row ? row.head : undefined
  } catch {
    return undefined
  }
}

const WRITE_TOOL_NAMES = new Set(["write_file", "edit_file", "write", "edit"])

type ToolLike = { name?: string; args?: unknown }

function writeTargets(tools: readonly ToolLike[]): string[] {
  const out: string[] = []
  for (const tool of tools) {
    if (!tool?.name || !WRITE_TOOL_NAMES.has(tool.name)) continue
    const args = (tool.args ?? {}) as Record<string, unknown>
    const target = args.path ?? args.file_path ?? args.filePath
    out.push(typeof target === "string" ? target : "")
  }
  return out
}

export type WriteTargetVerdict = "outside" | "ignored" | "visible" | "unknown"

/** 单个写目标 git 能不能看见：工作区外 / gitignore / 能看见 / 未确认（缺路径或 check-ignore 出错）。 */
export function writeTargetVerdict(root: string, target: string): WriteTargetVerdict {
  if (!target) return "unknown"
  const rel = relative(root, resolve(root, target))
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return "outside"
  try {
    const ignored = spawnSync("git", ["-C", root, "check-ignore", "-q", "--", rel], { timeout: 5_000 })
    // 0=被忽略；1=没忽略；其它=出错
    if (ignored.status === 0) return "ignored"
    if (ignored.status === 1) return "visible"
    return "unknown"
  } catch {
    return "unknown"
  }
}

/** 有任何 git 看不见（或无法确认）的写 → true。 */
export function hasInvisibleWrite(root: string, tools: readonly ToolLike[]): boolean {
  return writeTargets(tools).some((target) => writeTargetVerdict(root, target) !== "visible")
}

/**
 * 收工判定是待验收、但 git 确认这轮什么都没留下：不进待验收（回 in_progress）。
 * 全部满足才降级：工作区干净 + HEAD 与 run 开始时一致 + 没有工作区外 / gitignore 的写。
 */
export function downgradeReviewWhenGitClean(
  sessionId: string,
  turn: TurnOutcome,
  opts: { runId?: string; tools?: readonly ToolLike[] } = {},
  probe: GitCleanProbe = gitConfirmsClean
): TurnOutcome {
  if (turn.workflow !== "needs_review") return turn
  const root = sessionWorkspaceRoot(sessionId)
  if (!root) return turn
  if (probe(root) !== true) return turn
  if (opts.runId) {
    const start = runStartHead(opts.runId)
    if (!start || start !== gitHead(root)) return turn
  } else {
    return turn
  }
  if (hasInvisibleWrite(root, opts.tools ?? [])) return turn
  return { ...turn, workflow: "in_progress" }
}
