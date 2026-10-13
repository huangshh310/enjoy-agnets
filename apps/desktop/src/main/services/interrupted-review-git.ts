/**
 * luna（#145 后续 B）：强杀后什么都没写盘，也不能把会话打进「待验收」。
 * 与 #148 胶囊同一 fail-closed 规则：只有 **git 确认** 工作区干净才降级；非 git / 读不到 / 有改动一律照旧（宁可多审）。
 */
import { spawnSync } from "node:child_process"
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

/** 收工判定是待验收、但 git 确认没有任何改动：不进待验收（回 in_progress，与没写过盘的中断轮一致）。 */
export function downgradeReviewWhenGitClean(
  sessionId: string,
  turn: TurnOutcome,
  probe: GitCleanProbe = gitConfirmsClean
): TurnOutcome {
  if (turn.workflow !== "needs_review") return turn
  const root = sessionWorkspaceRoot(sessionId)
  if (!root) return turn
  return probe(root) === true ? { ...turn, workflow: "in_progress" } : turn
}
