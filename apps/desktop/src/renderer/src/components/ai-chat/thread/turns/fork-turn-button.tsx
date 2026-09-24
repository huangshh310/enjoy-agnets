/**
 * 从这一轮助手回复分叉出新会话。源会话继续跑，不恢复 ACP。
 */
import { useState } from "react"
import { RiGitBranchLine } from "@remixicon/react"
import { SessionForkResult, stripEnjoyActionsBlock } from "@enjoy-agents/ipc-contract"
import { MessageAction } from "@/components/ai-elements/message"
import { useT } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"
import { loadSession, refreshAllWorkspaces } from "@renderer/hooks/session-lifecycle"
import { useChatStore } from "@renderer/stores/chat-store"

/** 只有可见正文才能分叉。附件或来源本身不算正文。 */
export function canForkTurn(message: { content: string }): boolean {
  return stripEnjoyActionsBlock(message.content).trim().length > 0
}

export function ForkTurnButton({ messageId }: { messageId: string }) {
  const t = useT()
  const [forking, setForking] = useState(false)

  return (
    <MessageAction
      tooltip={forking ? t("chat.forking") : t("chat.forkFromHere")}
      label={t("chat.forkFromHere")}
      disabled={forking}
      onClick={() => {
        setForking(true)
        void forkFromMessage(messageId)
          .catch((error: unknown) => {
            const code = error instanceof Error ? error.message : ""
            useChatStore.getState().setError(code === "FORK_EMPTY" ? t("chat.forkEmpty") : t("chat.forkFailed"))
          })
          .finally(() => setForking(false))
      }}
    >
      <RiGitBranchLine className="size-4" />
    </MessageAction>
  )
}

async function forkFromMessage(messageId: string): Promise<void> {
  const store = useChatStore.getState()
  const sessionId = store.sessionId
  if (!sessionId) throw new Error("FORK_SESSION_NOT_FOUND")
  const created = SessionForkResult.parse(
    await getIde().session.fork({ sessionId, messageId })
  )
  const mode = store.sessionModes[sessionId] ?? store.mode
  useChatStore.setState({
    sessionModes: { ...useChatStore.getState().sessionModes, [created.id]: mode },
    sessionRuntimes: { ...useChatStore.getState().sessionRuntimes, [created.id]: created.runtimeId },
    sessionModels: created.modelId
      ? { ...useChatStore.getState().sessionModels, [created.id]: created.modelId }
      : useChatStore.getState().sessionModels
  })
  await loadSession(created.id, created.title)
  await refreshAllWorkspaces()
}
