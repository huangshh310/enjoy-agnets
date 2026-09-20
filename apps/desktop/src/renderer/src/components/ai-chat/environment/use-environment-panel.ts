/**
 * Environment 卡片数据：只读已有 store / git / 用量，不新开 IPC。
 */
import { visibleRecapText } from "@enjoy-agents/ipc-contract/session-recap-kind"
import { useComposerActiveModelLabel } from "@renderer/components/ai-chat/agent-picker/use-composer-active-model"
import { useQuotaHint } from "@renderer/components/ai-chat/usage/use-quota-hint"
import { useWorkspaceGit } from "@renderer/components/ai-chat/right-pane/views/review/use-workspace-git"
import { useContextInspectorData } from "@renderer/components/ai-chat/right-pane/views/context/use-context-inspector-data"
import { useChatStore } from "@renderer/stores/chat-store"

export function useEnvironmentPanel(enabled: boolean) {
  const workspaceId = useChatStore((state) => state.workspaceId)
  const workspaceName = useChatStore((state) => state.workspaceName)
  const workspaceRootLabel = useChatStore((state) => state.workspaceRootLabel)
  const additions = useChatStore((state) => state.additions)
  const deletions = useChatStore((state) => state.deletions)
  const runtimeId = useChatStore((state) => state.runtimeId)
  const sessionId = useChatStore((state) => state.sessionId)
  const recapRaw = useChatStore(
    (state) => state.repositories.find((row) => row.id === sessionId)?.recap ?? ""
  )
  const git = useWorkspaceGit(workspaceId, { enabled: enabled && Boolean(workspaceId) })
  const quota = useQuotaHint(runtimeId)
  const tokens = useContextInspectorData(workspaceId).tokenStats
  const modelLabel = useComposerActiveModelLabel()

  return {
    workspaceName,
    workspaceRootLabel,
    additions,
    deletions,
    branch: git.branch?.trim() || "",
    recap: visibleRecapText(recapRaw),
    quotaPercent: quota.percent,
    usedTokens: tokens.usedTokens,
    modelLabel,
    runtimeId
  }
}
