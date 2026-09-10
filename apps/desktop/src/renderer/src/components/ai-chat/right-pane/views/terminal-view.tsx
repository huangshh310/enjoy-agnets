/**
 * 工作区终端：xterm + 本机 PTY。
 */
import { WorkspaceTerminal } from "./workspace-terminal"
import { useTerminalSession } from "./use-terminal-session"
import { useT } from "@renderer/i18n"

export function TerminalView({ workspaceId }: { workspaceId: string | null }) {
  const t = useT()
  const { sessionId, error } = useTerminalSession(workspaceId)

  if (!workspaceId) {
    return (
      <p className="flex flex-1 items-center justify-center text-caption-1-medium text-text-tertiary">
        {t("chat.openFolderTerminal")}
      </p>
    )
  }
  if (error) {
    return (
      <p className="flex flex-1 items-center justify-center px-4 text-center text-caption-1-medium text-text-error-primary">
        {error}
      </p>
    )
  }
  if (!sessionId) {
    return (
      <p className="flex flex-1 items-center justify-center text-caption-1-medium text-text-tertiary">
        {t("chat.terminalStarting")}
      </p>
    )
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background-primary-default">
      <WorkspaceTerminal sessionId={sessionId} />
    </div>
  )
}
