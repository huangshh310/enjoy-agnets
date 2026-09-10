/**
 * 审查栏检查点列表。隐藏栏或未选该作用域时不打 IPC。
 */
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  EnjoyCheckpointItem,
  ListCheckpointsResult,
  PreviewCheckpointResult,
  RestoreCheckpointResult
} from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"

export function useWorkspaceCheckpoints(
  workspaceId: string | null,
  opts: { enabled?: boolean } = {}
) {
  const queryClient = useQueryClient()
  const enabled = (opts.enabled ?? true) && hasIde() && Boolean(workspaceId)

  const query = useQuery({
    queryKey: ["checkpoints", workspaceId],
    enabled,
    queryFn: async (): Promise<EnjoyCheckpointItem[]> => {
      if (!workspaceId) return []
      const result = (await getIde().workspace.listCheckpoints({
        workspaceId
      })) as ListCheckpointsResult
      return result.checkpoints ?? []
    }
  })

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["checkpoints", workspaceId] })
  }

  async function preview(ref: string): Promise<{ untrackedToDelete: string[] } | string> {
    if (!workspaceId) return "CHECKPOINT_NOT_FOUND"
    try {
      const result = (await getIde().workspace.previewCheckpoint({
        workspaceId,
        ref
      })) as PreviewCheckpointResult
      return { untrackedToDelete: result.untrackedToDelete ?? [] }
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
  }

  async function restore(ref: string, confirmDeleteUntracked = false): Promise<string | null> {
    if (!workspaceId) return "CHECKPOINT_NOT_FOUND"
    try {
      const result = (await getIde().workspace.restoreCheckpoint({
        workspaceId,
        ref,
        confirmDeleteUntracked
      })) as RestoreCheckpointResult
      if (!result.ok) return result.code
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["changes", workspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["checkpoints", workspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-git-log", workspaceId] })
      ])
      await queryClient.refetchQueries({ queryKey: ["changes", workspaceId] })
      return null
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
  }

  return {
    items: query.data ?? [],
    isRefreshing: query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
    refresh,
    preview,
    restore
  }
}
