/**
 * 子智能体单行：Blobatar 面孔 + 种子名 · 人格 · 标题 · 运行/完成/失败状态。
 * 点行才展开内部工具树。不是 Workflow DAG，也不是侧栏会话。
 */
import { useState, type ReactNode } from "react"
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiLoader4Line
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import { QuoteStepButton } from "@renderer/components/ai-chat/composer/runtime-interact/quote-step-button"
import { useT } from "@renderer/i18n"
import type { AgentStepNode } from "../agent-step-tree.types"
import { subagentFailedHint, subagentPersonaLabel } from "../delegate-step"
import { personaForSubagent, type SubagentPersona } from "../subagent-persona"
import { SubagentMark } from "./subagent-mark"
import { useExpandFocusedDelegate } from "../../subagent-pill/delegate-focus"

export function SubagentRow({
  node,
  tree,
  persona,
  isStandalone = false
}: {
  node: AgentStepNode
  tree?: ReactNode
  persona?: SubagentPersona
  isStandalone?: boolean
}) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  useExpandFocusedDelegate(node.id, setExpanded)
  const expandable = Boolean(node.children && node.children.length > 0 && tree)
  const failedHint = subagentFailedHint(node.status, t)
  const resolved = persona ?? personaForSubagent(node)
  const childStepCount = getChildStepCount(node)

  return (
    <div
      data-delegate-id={node.id}
      className={cx(
        "group flex w-full min-w-0 flex-col transition-colors",
        isStandalone
          ? "rounded-xl border border-border-button-default/70 bg-background-secondary-default/50 p-1 shadow-2xs"
          : "rounded-lg p-1 hover:bg-background-tertiary-default/30"
      )}
    >
      <div className="flex w-full min-w-0 items-center gap-1.5 text-caption-1-medium">
        <button
          type="button"
          onClick={() => {
            if (!expandable) return
            setExpanded((open) => !open)
          }}
          className={cx(
            "flex min-w-0 flex-1 items-center gap-2 bg-transparent px-1 py-0.5 text-left",
            expandable ? "cursor-pointer" : "cursor-default"
          )}
        >
          <SubagentMark persona={resolved} running={node.status === "running"} />
          <SubagentTitle node={node} persona={resolved} />

          {/* 右侧微状态 / 步骤计数 / 展开小箭头 */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {node.status === "running" ? (
              <RiLoader4Line className="size-3.5 animate-spin text-accent-500" />
            ) : failedHint ? (
              <span className="shrink-0 text-caption-2-medium text-text-error-primary">{failedHint}</span>
            ) : childStepCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded bg-background-tertiary-default/80 px-1.5 py-0.5 font-mono text-caption-2-medium text-text-tertiary border border-border-button-default/50 tabular-nums">
                {node.status === "completed" ? (
                  <RiCheckLine className="size-3 text-state-success-text" />
                ) : null}
                <span>{t("chat.subagentStepCount", { count: childStepCount })}</span>
              </span>
            ) : null}

            {expandable ? (
              expanded ? (
                <RiArrowDownSLine className="size-3.5 shrink-0 text-text-tertiary group-hover:text-text-primary transition-colors" />
              ) : (
                <RiArrowRightSLine className="size-3.5 shrink-0 text-text-tertiary group-hover:text-text-primary transition-colors" />
              )
            ) : null}
          </div>
        </button>

        <div className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <QuoteStepButton node={node} />
        </div>
      </div>

      {/* 展开后的子工具树：配备左侧树形引导导轨 */}
      {expanded && tree ? (
        <div className="relative ml-2.5 mt-1 border-l border-border-button-default/50 pl-3.5 pt-0.5 pb-1">
          {tree}
        </div>
      ) : null}
    </div>
  )
}

function SubagentTitle({ node, persona }: { node: AgentStepNode; persona: SubagentPersona }) {
  const t = useT()
  const kind = subagentPersonaLabel(node.subagentKind, t)
  const heading = node.heading?.trim() || ""
  const isExplore = node.subagentKind === "explore"

  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden" title={node.title}>
      <span className="shrink-0 font-medium text-text-primary text-caption-1-medium">{persona.seed}</span>
      <span
        className={cx(
          "shrink-0 rounded px-1.5 py-0.2 font-sans text-caption-2-medium tracking-wider",
          isExplore
            ? "bg-accent-500/10 text-accent-500 border border-accent-500/20"
            : "bg-background-tertiary-default text-text-secondary border border-border-button-default/50"
        )}
      >
        {kind}
      </span>
      {heading ? (
        <span className="min-w-0 flex-1 truncate text-caption-1-regular text-text-secondary group-hover:text-text-primary transition-colors">
          {heading}
        </span>
      ) : null}
    </span>
  )
}

function getChildStepCount(node: AgentStepNode): number {
  if (!node.children || node.children.length === 0) return 0
  let count = 0
  for (const child of node.children) {
    if (child.isBatch && child.batchItems) {
      count += child.batchItems.length
    } else {
      count += 1
    }
  }
  return count
}
