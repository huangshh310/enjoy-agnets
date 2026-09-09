/**
 * 工作区真实 Git 日志、提交、推送与 patch。空日志不回落 mock，上游失败不写死 main。
 * 审查栏隐藏时不要发 gitLog，避免主进程被 git 堵住整窗。
 */
import { useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { GitLogResult } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import type { CommitListItem } from "./review.types"
import type { ChangedFileRow } from "@renderer/stores/chat-store"

const EMPTY_LOG: GitLogResult = { branch: "", upstream: "", branchFiles: [], commits: [] }

function initialsFromAuthor(name: string): string {
  if (!name.trim()) return "?"
  const parts = name.trim().split(/[\s_-]+/)
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function toCommitListItem(item: GitLogResult["commits"][number]): CommitListItem {
  return {
    id: item.hash,
    hash: item.hash,
    shortHash: item.shortHash || item.hash.slice(0, 7),
    message: item.message,
    authorName: item.authorName,
    authorInitials: initialsFromAuthor(item.authorName),
    relativeTime: item.relativeTime || item.date,
    filesChanged: item.filesChanged,
    additions: item.additions,
    deletions: item.deletions,
    isMerge: /^\s*merge\b/i.test(item.message)
  }
}

export function useWorkspaceGit(
  workspaceId: string | null,
  opts: { enabled?: boolean; includeBranchFiles?: boolean } = {}
) {
  const queryClient = useQueryClient()
  const enabled = (opts.enabled ?? true) && hasIde() && Boolean(workspaceId)
  const includeBranchFiles = opts.includeBranchFiles ?? false

  const gitQuery = useQuery({
    queryKey: ["workspace-git-log", workspaceId, includeBranchFiles],
    enabled,
    queryFn: async (): Promise<GitLogResult> => {
      if (!workspaceId) return EMPTY_LOG
      return (await getIde().workspace.gitLog({
        workspaceId,
        limit: 30,
        includeBranchFiles
      })) as GitLogResult
    }
  })

  const rawData = gitQuery.data ?? EMPTY_LOG
  const commits = useMemo(
    () => (rawData.commits ?? []).map(toCommitListItem),
    [rawData.commits]
  )

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["workspace-git-log", workspaceId] })
  }

  async function commitChanges(
    message: string,
    stageAll = false
  ): Promise<{ ok: boolean; output?: string }> {
    if (!workspaceId || !message.trim()) return { ok: false }
    try {
      const res = (await getIde().workspace.gitCommit({
        workspaceId,
        message: message.trim(),
        stageAll
      })) as { ok: boolean; output: string }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workspace-git-log", workspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["changes", workspaceId] })
      ])
      return { ok: true, output: res.output }
    } catch (err) {
      return { ok: false, output: err instanceof Error ? err.message : String(err) }
    }
  }

  async function pushChanges(): Promise<{ ok: boolean; output?: string }> {
    if (!workspaceId) return { ok: false }
    try {
      const res = (await getIde().workspace.gitPush({ workspaceId })) as {
        ok: boolean
        output: string
      }
      return { ok: true, output: res.output }
    } catch (err) {
      return { ok: false, output: err instanceof Error ? err.message : String(err) }
    }
  }

  async function stagePaths(
    paths: string[],
    action: "add" | "unstage"
  ): Promise<{ ok: boolean; output?: string }> {
    if (!workspaceId || paths.length === 0) return { ok: false }
    try {
      await getIde().workspace.gitStage({ workspaceId, paths, action })
      await queryClient.invalidateQueries({ queryKey: ["changes", workspaceId] })
      return { ok: true }
    } catch (err) {
      return { ok: false, output: err instanceof Error ? err.message : String(err) }
    }
  }

  async function readPatch(paths?: string[]): Promise<string> {
    if (!workspaceId) return ""
    const res = (await getIde().workspace.gitPatch({ workspaceId, paths })) as { patch: string }
    return res.patch ?? ""
  }

  return {
    branch: rawData.branch,
    upstream: rawData.upstream ?? "",
    branchFiles: (rawData.branchFiles ?? EMPTY_LOG.branchFiles) as ChangedFileRow[],
    commits,
    isRefreshing: gitQuery.isFetching,
    refresh,
    commitChanges,
    pushChanges,
    stagePaths,
    readPatch
  }
}
