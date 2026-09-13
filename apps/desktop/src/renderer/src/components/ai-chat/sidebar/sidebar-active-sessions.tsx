/**
 * 情境栏顶「进行中」钉住：后台仍在跑或等你处理的会话。无则整组不渲染。
 */
import { useMemo } from "react"
import { useT } from "@renderer/i18n"
import { useAttentionStore } from "@renderer/stores/attention/attention-store"
import { useChatStore } from "@renderer/stores/chat-store"
import { pickActiveSessions, sessionActivity } from "./session-activity"
import { SidebarSessionRow } from "./sidebar-session-row"

export function SidebarActiveSessions({
  sessions,
  sessionId,
  onSelectSession,
  formatTime
}: {
  sessions: Array<{ id: string; name: string; updatedAt: number }>
  sessionId: string | null
  onSelectSession: (id: string) => void
  formatTime: (timestamp: number) => string
}) {
  const t = useT()
  const currentId = useChatStore((state) => state.sessionId)
  const running = useChatStore((state) => state.running)
  const additions = useChatStore((state) => state.additions)
  const deletions = useChatStore((state) => state.deletions)
  const parks = useAttentionStore((state) => state.parks)
  const items = useAttentionStore((state) => state.items)
  const active = useMemo(
    () =>
      pickActiveSessions(sessions, (id) =>
        sessionActivity({ sessionId: id, currentId, running, parks, items })
      ),
    [sessions, currentId, running, parks, items]
  )
  if (active.length === 0) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="px-2 text-caption-2-medium text-text-tertiary">{t("chat.sessionActive")}</span>
      {active.map((session) => (
        <SidebarSessionRow
          key={`active-${session.id}`}
          sessionId={session.id}
          name={session.name}
          active={session.id === sessionId}
          updatedAt={session.updatedAt}
          formatTime={formatTime}
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
