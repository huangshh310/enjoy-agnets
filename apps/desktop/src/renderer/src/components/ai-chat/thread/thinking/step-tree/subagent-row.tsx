/**
 * 子智能体单行：Blobatar 面孔 + 种子名 · 人格 · 标题 · 运行/失败。
 * 点行才展开内部工具树。不是 Workflow DAG，也不是侧栏会话。
 */
import { useState, type ReactNode } from "react"
import { RiArrowDownSLine, RiArrowRightSLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { QuoteStepButton } from "@renderer/components/ai-chat/composer/runtime-interact/quote-step-button"
import { useT } from "@renderer/i18n"
import type { AgentStepNode } from "../agent-step-tree.types"
import { subagentFailedHint, subagentPersonaLabel } from "../delegate-step"
import { personaForSubagent, type SubagentPersona } from "../subagent-persona"
import { SubagentMark } from "./subagent-mark"

export function SubagentRow({
  node,
  tree,
  persona
}: {
  node: AgentStepNode
  tree?: ReactNode
  persona?: SubagentPersona
}) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const expandable = Boolean(node.children && node.children.length > 0 && tree)
  const failedHint = subagentFailedHint(node.status, t)
  const resolved = persona ?? personaForSubagent(node)

  return (
    <div className="group flex w-full min-w-0 flex-col gap-0.5">
      <div className="flex w-full min-w-0 items-center gap-1.5 text-caption-1-medium">
        <button
          type="button"
          onClick={() => {
            if (!expandable) return
            setExpanded((open) => !open)
          }}
          className={cx(
            "flex min-w-0 flex-1 items-center gap-1.5 bg-transparent p-0 text-left",
            expandable ? "cursor-pointer" : "cursor-default"
          )}
        >
          <SubagentMark persona={resolved} running={node.status === "running"} />
          <SubagentTitle node={node} persona={resolved} />
          {failedHint ? <span className="shrink-0 text-text-error-primary">{failedHint}</span> : null}
          {expandable ? (
            expanded ? (
              <RiArrowDownSLine className="size-3.5 shrink-0 text-text-tertiary" />
            ) : (
              <RiArrowRightSLine className="size-3.5 shrink-0 text-text-tertiary" />
            )
          ) : null}
        </button>
        <div className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <QuoteStepButton node={node} />
        </div>
      </div>
      {expanded && tree ? <div className="pl-5">{tree}</div> : null}
    </div>
  )
}

function SubagentTitle({ node, persona }: { node: AgentStepNode; persona: SubagentPersona }) {
  const t = useT()
  const kind = subagentPersonaLabel(node.subagentKind, t)
  const heading = node.heading?.trim() || ""
  return (
    <span className="min-w-0 flex-1 truncate" title={node.title}>
      <span className="text-text-primary">{persona.seed}</span>
      <span className="text-text-tertiary"> · </span>
      <span className="text-text-secondary">{t("chat.subagentKind", { kind })}</span>
      {heading ? (
        <>
          <span className="text-text-tertiary"> · </span>
          <span className="text-text-primary">{heading}</span>
        </>
      ) : null}
    </span>
  )
}
