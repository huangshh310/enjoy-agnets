"use client"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cx } from "@/utils/cx"
import { useChatStore } from "@renderer/stores/chat-store"
import { AgentLimitsCard } from "./agent-limits/agent-limits-card"
import { CompactSessionButton } from "./right-pane/views/context/compact-session"
import { useContextInspectorData } from "./right-pane/views/context/use-context-inspector-data"
import { StatusBranchPicker } from "./status-bar/status-branch-picker"
import { StatusProjectPicker } from "./status-bar/status-project-picker"
import { useT } from "@renderer/i18n"


export function AiChatStatusBar({
  workspaceRootLabel
}: {
  workspaceRootLabel: string
}) {
  const t = useT()
  const sessionId = useChatStore((state) => state.sessionId)
  const workspaceId = useChatStore((state) => state.workspaceId)
  const messageCount = useChatStore((state) => state.messages.length)
  const inspector = useContextInspectorData(workspaceId)
  const compaction = inspector.compaction
  const capKnown = inspector.tokenStats.maxTokens > 0
  const usagePercent = Math.min(100, Math.max(0, Math.round(inspector.tokenStats.usagePercent)))

  return (
    <div
      data-toast-clearance=""
      className="flex min-w-0 flex-nowrap items-center gap-3 overflow-hidden px-8 pb-4 text-caption-1-medium text-text-secondary max-[1000px]:gap-1.5 max-[1000px]:px-6 [@media(max-height:440px)]:pb-1"
    >
      <StatusBranchPicker />
      <StatusProjectPicker workspaceRootLabel={workspaceRootLabel} />
      <div className="ml-auto inline-flex min-w-0 shrink items-center gap-2 whitespace-nowrap [&>*]:shrink-0 [&>*:last-child]:shrink">
        <CompactSessionButton sessionId={sessionId} messageCount={messageCount} />
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              title={
                compaction
                  ? t("chat.contextTokensHintCompacted", { percent: compaction.savedPercent })
                  : t("chat.contextTokensHint")
              }
              data-testid="status-context-meter"
              className="inline-flex min-w-0 items-center gap-1.5 rounded-full py-0.5 px-2 text-caption-1-medium text-text-tertiary transition-colors hover:bg-background-secondary-hover hover:text-text-primary cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            >
              <ContextRing value={capKnown ? usagePercent : 0} />
              {/* 窄窗（≤1000）上下文未知时只留圆环，文字进 title，让分支 / 项目名别被挤成「未检…」（jojo 巡检）。 */}
              <span className={cx("min-w-12 max-w-40 truncate font-medium font-mono", !capKnown && "max-[1000px]:hidden")}>
                {capKnown
                  ? `${usagePercent}%`
                  : inspector.modelLabel
                    ? t("chat.inspectorCapUnknownModel", { model: inspector.modelLabel })
                    : t("chat.inspectorCapUnknown")}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="top"
            sideOffset={12}
            className="p-0 border-none bg-transparent shadow-none w-auto"
          >
            <AgentLimitsCard />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

function ContextRing({ value }: { value: number }) {
  const radius = 6
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0" aria-hidden>
      <circle cx="8" cy="8" r={radius} fill="none" stroke="currentColor" strokeWidth="2" className="text-border-button-default" />
      <circle
        cx="8"
        cy="8"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="origin-center -rotate-90 text-text-primary"
      />
    </svg>
  )
}
