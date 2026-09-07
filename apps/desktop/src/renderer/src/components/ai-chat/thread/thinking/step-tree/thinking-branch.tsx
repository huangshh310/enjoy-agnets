/**
 * 思考过程折叠：去卡片化左侧引线 + 字数 + 复制。
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

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="group flex w-full items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="group inline-flex cursor-pointer items-center gap-1.5 text-caption-1-medium font-semibold text-text-primary hover:text-accent-500"
        >
          <span>{title}</span>
          <span className="font-mono text-caption-2-regular font-normal text-text-tertiary">
            ({t("chat.cotChars", { count: rawText.length })})
          </span>
          {open ? (
            <RiArrowDownSLine className="size-3.5 text-text-tertiary group-hover:text-accent-500" />
          ) : (
            <RiArrowRightSLine className="size-3.5 text-text-tertiary group-hover:text-accent-500" />
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
