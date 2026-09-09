/**
 * 按文件暂存 / 取消暂存。路径必须在工作区内。
 */
import { runGit } from "./command"
import { resolveInsideWorkspace } from "./paths"
import { normalizeRel } from "./workspace-git-restore-split"

export async function stageWorkspacePaths(
  workspaceRoot: string,
  paths: string[],
  action: "add" | "unstage"
): Promise<{ ok: true; count: number }> {
  const jailed = uniqueJailedRels(workspaceRoot, paths)
  if (jailed.length === 0) throw new Error("STAGE_NOTHING_MATCHED")
  const args =
    action === "add" ? ["add", "--", ...jailed] : ["restore", "--staged", "--", ...jailed]
  const res = await runGit(workspaceRoot, args)
  if (res.exitCode !== 0) throw new Error(res.stderr || "git stage failed")
  return { ok: true, count: jailed.length }
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
