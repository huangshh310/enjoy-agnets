/**
 * 按文件或按目录暂存 / 取消暂存。路径必须在工作区内。
 * 目录只命中 porcelain 里该前缀下的变更，不 `git add -A`。
 * Git 使用 `--literal-pathspecs`，文件名里的 `*` `?` `[` 不当通配符。
 */
import { runGit } from "./command.ts"
import { resolveInsideWorkspace } from "./paths.ts"
import { normalizeRel } from "./workspace-git-restore-split.ts"
import { parsePorcelainLine } from "./workspace-git-status.ts"

export type StagePathRow = {
  path: string
  staged: boolean
}

/** Git 全局 `--literal-pathspecs` 必须在子命令前面。本地和 SSH 共用这一组参数。 */
export function stageGitArgs(action: "add" | "unstage", targets: string[]): string[] {
  const verb = action === "add" ? ["add"] : ["restore", "--staged"]
  return ["--literal-pathspecs", ...verb, "--", ...targets]
}

/**
 * 只收 porcelain 里的文件行。目录请求展开成该前缀下的文件，不把目录路径交给 git。
 * 取消暂存只保留已暂存的文件。没有文件行就跳过，避免 `git add <dir>`。
 */
export function expandStageTargets(
  requested: string[],
  rows: StagePathRow[],
  action: "add" | "unstage"
): string[] {
  const files = fileStageRows(rows)
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of requested) {
    const path = normalizeRel(raw).replace(/\/+$/, "")
    if (!path) continue
    for (const row of files) {
      if (row.path !== path && !row.path.startsWith(`${path}/`)) continue
      if (action === "unstage" && !row.staged) continue
      pushStagePath(out, seen, row.path)
    }
  }
  return out
}

export async function stageWorkspacePaths(
  workspaceRoot: string,
  paths: string[],
  action: "add" | "unstage"
): Promise<{ ok: true; count: number }> {
  const jailed = uniqueJailedRels(workspaceRoot, paths)
  if (jailed.length === 0) throw new Error("STAGE_NOTHING_MATCHED")
  const targets = expandStageTargets(jailed, await porcelainStageRows(workspaceRoot), action)
  if (targets.length === 0) throw new Error("STAGE_NOTHING_MATCHED")
  const res = await runGit(workspaceRoot, stageGitArgs(action, targets))
  if (res.exitCode !== 0) throw new Error(res.stderr || "git stage failed")
  return { ok: true, count: targets.length }
}

async function porcelainStageRows(workspaceRoot: string): Promise<StagePathRow[]> {
  const status = await runGit(workspaceRoot, ["status", "--porcelain", "--untracked-files=all"])
  const rows: StagePathRow[] = []
  for (const line of status.stdout.split("\n")) {
    const row = parsePorcelainLine(line.trimEnd(), new Map())
    if (row) rows.push({ path: row.path, staged: row.staged })
  }
  return rows
}

function uniqueJailedRels(workspaceRoot: string, paths: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const path of paths) {
    resolveInsideWorkspace(workspaceRoot, path)
    const rel = normalizeRel(path)
    if (!rel || seen.has(rel)) continue
    seen.add(rel)
    out.push(rel)
  }
  return out
}

/** 丢掉末尾带 `/` 的目录行。默认 porcelain 会把未跟踪目录收成 `dir/`。 */
function fileStageRows(rows: StagePathRow[]): StagePathRow[] {
  return rows
    .map((row) => ({ path: normalizeRel(row.path), staged: row.staged }))
    .filter((row) => row.path.length > 0 && !row.path.endsWith("/"))
}

function pushStagePath(out: string[], seen: Set<string>, path: string): void {
  if (!path || seen.has(path)) return
  seen.add(path)
  out.push(path)
}
