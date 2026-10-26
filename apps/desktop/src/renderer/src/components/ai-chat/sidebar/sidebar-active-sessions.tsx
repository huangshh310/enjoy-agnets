import { useSessionChangesSummary } from "@renderer/hooks/session-changes"
/**
 * 情境栏顶钉住：后台仍在跑 / 等你 / 未消 error。无则整组不渲染。
 * 只有未消 error 时标题用「需处理」，有 live running/等你仍用「进行中」。
 * 运行中会话仍可同时出现在项目树；高亮只跟点中的那一行。
 */
import { useMemo } from "react"
import { useT } from "@renderer/i18n"
import { useAttentionStore } from "@renderer/stores/attention/attention-store"
import { useChatStore } from "@renderer/stores/chat-store"
import { activePinLabelKey, pickActiveSessions, sessionActivity } from "./session-activity"
import { isSessionRowActive, type SessionRowClick } from "./session-row-highlight"
import { SidebarSessionRow } from "./sidebar-session-row"

export function SidebarActiveSessions({
  sessions,
  sessionId,
  clickedRow,
  onSelectSession,
  formatTime
}: {
  sessions: Array<{ id: string; name: string; updatedAt: number }>
  sessionId: string | null
  clickedRow: SessionRowClick | null
  onSelectSession: (id: string) => void
  formatTime: (timestamp: number) => string
}) {
  const t = useT()
  const currentId = useChatStore((state) => state.sessionId)
  const running = useChatStore((state) => state.running)
  // luna P2：当前会话行 +/- 走会话口径（只读会话不挂整仓改动）。
  const { additions, deletions } = useSessionChangesSummary()
  const parks = useAttentionStore((state) => state.parks)
  const items = useAttentionStore((state) => state.items)
  const { active, pinLabelKey } = useMemo(() => {
    const activityOf = (id: string) =>
      sessionActivity({ sessionId: id, currentId, running, parks, items })
    const pinned = pickActiveSessions(sessions, activityOf)
    return {
      active: pinned,
      pinLabelKey: activePinLabelKey(pinned.map((session) => activityOf(session.id)))
    }
  }, [sessions, currentId, running, parks, items])
  if (active.length === 0) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="px-2 text-caption-2-medium text-text-tertiary">{pinLabelKey === "sessionNeedsAttention" ? t("chat.sessionNeedsAttention") : t("chat.sessionActive")}</span>
      {active.map((session) => (
        <SidebarSessionRow
          key={`active-${session.id}`}
          sessionId={session.id}
          name={session.name}
          active={isSessionRowActive(session.id, sessionId, clickedRow, "active")}
          updatedAt={session.updatedAt}
          formatTime={formatTime}
          surface="active"
          changesSummary={
            session.id === currentId && (additions > 0 || deletions > 0)
              ? { additions, deletions }
              : null
          }
          className="rounded-xl"
          onSelect={() => onSelectSession(session.id)}
        />
      ))}
    </div>
  )
}
