/**
 * 侧栏会话行：左侧 Agent 标，运行中右侧用与 Thinking 头相同的 LoadingStateGlyph。
 */
import { RiInboxArchiveLine } from "@remixicon/react"
import { LoadingStateGlyph } from "@/components/ai-elements/loading-state"
import { cx } from "@/utils/cx"
import { SessionAgentMark } from "@renderer/components/ai-chat/sidebar/session-agent-mark"
import { useT } from "@renderer/i18n"
import type { SidebarSessionRowProps } from "./sidebar-session-row.types"

export function SidebarSessionRow({
  sessionId,
  name,
  active,
  running,
  updatedAt,
  formatTime,
  onSelect,
  onArchive,
  className,
  nameClassName = "text-caption-1-medium"
}: SidebarSessionRowProps) {
  return (
    <div
      className={cx(
        "group/session flex w-full items-center gap-1",
        active
          ? "bg-background-tertiary-default text-text-primary shadow-2xs"
          : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary",
        className
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-left"
      >
        <SessionAgentMark sessionId={sessionId} />
        <span className={cx("min-w-0 flex-1 truncate", nameClassName)}>{name}</span>
        <SessionRowMeta running={running} updatedAt={updatedAt} formatTime={formatTime} hideOnHover={Boolean(onArchive)} />
      </button>
      {onArchive ? <ArchiveSessionButton onArchive={onArchive} /> : null}
    </div>
  )
}

function SessionRowMeta({
  running,
  updatedAt,
  formatTime,
  hideOnHover
}: {
  running: boolean
  updatedAt: number
  formatTime: (timestamp: number) => string
  hideOnHover: boolean
}) {
  const hide = hideOnHover ? "group-hover/session:hidden" : undefined
  if (running) return <LoadingStateGlyph variant="drive" className={cx("shrink-0", hide)} />
  return <span className={cx("shrink-0 text-caption-2-medium text-text-tertiary", hide)}>{formatTime(updatedAt)}</span>
}

function ArchiveSessionButton({ onArchive }: { onArchive: () => void }) {
  const t = useT()
  return (
    <button
      type="button"
      title={t("chat.archiveSession")}
      onClick={onArchive}
      className="mr-1 hidden size-5.5 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-background-primary-default hover:text-text-primary group-hover/session:flex"
    >
      <RiInboxArchiveLine className="size-3.5" />
    </button>
  )
}
