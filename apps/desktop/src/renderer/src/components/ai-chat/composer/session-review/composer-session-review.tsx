/**
 * Composer 上方本轮改动条：文件列表 + 顶边跳动宠物。
 */
import { useMemo, useRef } from "react"
import { pathsFromLastTurn } from "@renderer/components/ai-chat/right-pane/views/review/last-turn-paths"
import { useChatStore } from "@renderer/stores/chat-store"
import { collectSessionFiles } from "./collect-session-files"
import { openSessionReview } from "./open-session-review"
import { SessionMascotRunner } from "./session-mascot-runner"
import { SessionReviewBar } from "./session-review-bar"
import { sessionReviewVisible } from "./session-review-visible"
import type { SessionReviewFile } from "./session-review.types"

export function ComposerSessionReview() {
  const messages = useChatStore((state) => state.messages)
  const changes = useChatStore((state) => state.changes)
  const running = useChatStore((state) => state.running)
  const runStartedAt = useChatStore((state) => state.runStartedAt)
  const modelLabel = useChatStore((state) => state.modelLabel)
  const boxRef = useRef<HTMLDivElement>(null)

  const files = useMemo(() => collectReviewFiles(messages, changes), [messages, changes])

  if (!sessionReviewVisible(files.length, running)) return null

  return (
    <div className="relative z-20 mb-1.5 w-full animate-in fade-in-50 duration-200">
      <div
        ref={boxRef}
        data-session-review
        className="relative flex w-full flex-col rounded-xl border border-border-button-default bg-background-secondary-default/95 px-3 py-1.5 shadow-2xs backdrop-blur-md"
      >
        {running ? (
          <div className="pointer-events-none absolute -top-[18px] left-0 right-0 z-30 h-0 overflow-visible">
            <SessionMascotRunner boxRef={boxRef} active={running} />
          </div>
        ) : null}
        <SessionReviewBar
          files={files}
          running={running}
          runStartedAt={runStartedAt ?? undefined}
          modelLabel={modelLabel}
          onOpenReview={() => openSessionReview()}
          onOpenFile={(path) => openSessionReview(path)}
        />
      </div>
    </div>
  )
}

function collectReviewFiles(
  messages: Parameters<typeof pathsFromLastTurn>[0],
  changes: Parameters<typeof collectSessionFiles>[1]
): SessionReviewFile[] {
  const lastTurnPaths = pathsFromLastTurn(messages)
  if (lastTurnPaths.length > 0) return collectSessionFiles(lastTurnPaths, changes)
  return changes.map((row) => ({
    path: row.path,
    name: row.path.split(/[\\/]/).pop() || row.path,
    additions: row.additions ?? 0,
    deletions: row.deletions ?? 0
  }))
}
