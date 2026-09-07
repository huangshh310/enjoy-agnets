/**
 * 思考过程折叠：折叠头只留单行摘要。
 * 字数不进标题行，避免和引用按钮抢宽把「(N 字符)」挤成两行。
 */
import { useEffect, useState } from "react"
import { RiArrowDownSLine, RiArrowRightSLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import type { AgentStepNode } from "../agent-step-tree.types"
import { ThinkingBranchActions } from "./thinking-branch-actions"

export function lastThinkingNodeId(nodes: Array<{ id: string; kind: string }>): string | null {
  for (let index = nodes.length - 1; index >= 0; index--) {
    const node = nodes[index]
    if (node?.kind === "thinking") return node.id
  }
  return null
}

export function ThinkingNodeBranch({
  title,
  rawText,
  defaultOpen = true,
  node
}: {
  title: string
  rawText: string
  defaultOpen?: boolean
  node?: AgentStepNode
}) {
  const t = useT()
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    setOpen(defaultOpen)
  }, [defaultOpen])

  const charsLabel = t("chat.cotChars", { count: rawText.length })

  return (
    <div className="flex w-full min-w-0 flex-col gap-1">
      <div className="group flex w-full min-w-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          title={`${title} · ${charsLabel}`}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left"
        >
          <span className="min-w-0 flex-1 truncate text-caption-1-medium font-semibold text-text-primary group-hover:text-accent-500">
            {title}
          </span>
          {open ? (
            <RiArrowDownSLine className="size-3.5 shrink-0 text-text-tertiary group-hover:text-accent-500" />
          ) : (
            <RiArrowRightSLine className="size-3.5 shrink-0 text-text-tertiary group-hover:text-accent-500" />
          )}
        </button>
        <ThinkingBranchActions node={node} rawText={rawText} open={open} />
      </div>
      {open ? (
        <div className="my-1 ml-0.5 border-l-2 border-border-button-default/80 pl-3">
          <div className="max-h-80 overflow-y-auto whitespace-pre-wrap pr-2 font-sans text-caption-1-regular leading-relaxed text-text-secondary/85">
            {rawText}
          </div>
        </div>
      ) : null}
    </div>
  )
}
