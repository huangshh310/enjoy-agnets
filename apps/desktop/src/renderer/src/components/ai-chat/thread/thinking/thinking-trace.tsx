/**
 * Beautiful UI Thinking：有推理 / 工具才挂；结束后收起时间线但不卸掉头。
 */
import { useEffect, useState, type CSSProperties } from "react"
import { RiArrowDownSLine, RiSparklingFill } from "@remixicon/react"
import { LoadingElapsed, LoadingStateGlyph } from "@/components/ai-elements/loading-state"
import { cx } from "@/utils/cx"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { buildTraceRows, isTraceExpanded, thinkingHeadline } from "./thinking-rows"
import { ThinkingSteps } from "./thinking-steps"
import { parseAgentStepNodes } from "./agent-step-tree-parser"
import { useT } from "@renderer/i18n"
import { useOpenTraceForFocus } from "../subagent-pill/delegate-focus"

const SHIMMER_TONE = {
  "--bui-agent-thinking-tone": "var(--color-text-secondary)"
} as CSSProperties

export function ThinkingTrace({
  reasoning,
  tools,
  streaming,
  startedAt,
  thoughtSeconds
}: {
  reasoning: string
  tools: ThreadToolCall[]
  streaming: boolean
  startedAt: number
  thoughtSeconds?: number
}) {
  const t = useT()
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)
  useOpenTraceForFocus(tools, setManualOpen)
  const seconds = useSettledSeconds(startedAt, streaming, thoughtSeconds)
  const rows = buildTraceRows(reasoning, tools, t)
  const nodes = parseAgentStepNodes(reasoning, tools, t)
  const hasContent = Boolean(reasoning.trim()) || tools.length > 0
  const expanded = manualOpen ?? (streaming ? hasContent : isTraceExpanded(streaming, tools, null))
  useEffect(() => {
    if (streaming) setManualOpen(null)
  }, [streaming])

  return (
    <div className="mb-2 flex w-full flex-col">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setManualOpen((current) => !isTraceExpanded(streaming, tools, current))}
        className="-ml-1.5 flex w-fit cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-left outline-none hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        {streaming ? (
          <LoadingStateGlyph variant="drive" />
        ) : (
          <RiSparklingFill className="size-4 shrink-0 text-text-tertiary" />
        )}
        <span
          className={cx(
            "text-caption-1-medium whitespace-nowrap",
            streaming ? "bui-agent-thinking-label" : "text-text-primary"
          )}
          style={streaming ? SHIMMER_TONE : undefined}
        >
          {thinkingHeadline(streaming, tools, seconds, t)}
        </span>
        {streaming ? <LoadingElapsed startedAt={startedAt} /> : null}
        <RiArrowDownSLine
          className={cx(
            "size-3.5 text-text-tertiary transition-transform duration-300",
            expanded ? "rotate-180" : "rotate-0"
          )}
        />
      </button>

      <div
        className="grid transition-[grid-template-rows,opacity] duration-300"
        style={{
          gridTemplateRows: expanded ? "auto" : "0fr",
          opacity: expanded ? 1 : 0
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <ThinkingSteps nodes={nodes} rows={rows} />
        </div>
      </div>
    </div>
  )
}

function useSettledSeconds(
  startedAt: number,
  streaming: boolean,
  thoughtSeconds?: number
): number | null {
  const [live, setLive] = useState(1)
  const [frozen, setFrozen] = useState<number | null>(thoughtSeconds ?? null)

  useEffect(() => {
    if (streaming) {
      setFrozen(null)
      const tick = () => setLive(Math.max(1, Math.ceil((Date.now() - startedAt) / 1000)))
      tick()
      const timer = window.setInterval(tick, 1000)
      return () => window.clearInterval(timer)
    }
    setFrozen(thoughtSeconds ?? frozenFromStart(startedAt))
    return undefined
  }, [startedAt, streaming, thoughtSeconds])

  return streaming ? live : (thoughtSeconds ?? frozen)
}

function frozenFromStart(startedAt: number): number | null {
  const elapsed = Math.ceil((Date.now() - startedAt) / 1000)
  return elapsed > 0 && elapsed <= 180 ? Math.max(1, elapsed) : null
}
