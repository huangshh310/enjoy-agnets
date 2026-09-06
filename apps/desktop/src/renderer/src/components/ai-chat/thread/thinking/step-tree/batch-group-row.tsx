/**
 * 批量编辑 / 阅读 / 命令聚合行。图标走 Remix，不用 emoji。
 */
import { useState } from "react"
import { RiArrowDownSLine, RiArrowRightSLine, RiCheckLine, RiCloseLine, RiTerminalBoxLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { FileTypeIcon } from "@renderer/components/ai-chat/file-type-icon"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import type { AgentStepNode } from "../agent-step-tree.types"
import { DomainPills } from "./domain-pills"
import { StepGlyph } from "./step-glyph"

export function BatchEditingGroupRow({ node }: { node: AgentStepNode }) {
  const [open, setOpen] = useState(true)
  const items = node.batchItems ?? []
  const isCmd = node.kind === "command"
  return (
    <div className="my-0.5 flex w-full flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="group flex w-fit cursor-pointer items-center gap-1.5 text-caption-1-medium text-text-primary"
      >
        <StepGlyph kind={node.kind} />
        <span className="text-text-primary">{node.title}</span>
        <BatchDiff additions={node.additions} deletions={node.deletions} />
        {open ? (
          <RiArrowDownSLine className="size-3.5 text-text-tertiary group-hover:text-text-primary" />
        ) : (
          <RiArrowRightSLine className="size-3.5 text-text-tertiary group-hover:text-text-primary" />
        )}
      </button>
      {node.domainPills && node.domainPills.length > 0 ? <DomainPills pills={node.domainPills} /> : null}
      {open ? (
        <div className="ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-border-button-default/60 py-0.5 pl-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (!isCmd) void openChangedFile(item.path)
              }}
              className={cx(
                "flex w-full items-center gap-2 rounded px-1.5 py-0.5 text-left font-mono text-caption-1-regular",
                isCmd ? "text-text-secondary" : "cursor-pointer hover:bg-background-secondary-hover"
              )}
            >
              <span className="w-7 shrink-0 font-sans text-caption-2-regular text-text-tertiary">
                {item.actionVerb}
              </span>
              {isCmd ? (
                <RiTerminalBoxLine className="size-3.5 shrink-0 text-text-tertiary" />
              ) : (
                <FileTypeIcon name={item.fileName} />
              )}
              <span className="truncate text-text-secondary">{isCmd ? item.fileName : item.path}</span>
              {item.status === "completed" ? (
                <RiCheckLine className="ml-auto size-3 shrink-0 text-state-success-text" />
              ) : item.status === "error" ? (
                <RiCloseLine className="ml-auto size-3 shrink-0 text-text-error-primary" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function BatchDiff({ additions, deletions }: { additions?: number; deletions?: number }) {
  if (additions == null && deletions == null) return null
  return (
    <span className="font-mono text-caption-2-medium tabular-nums">
      {additions != null ? <span className="text-state-success-text">+{additions}</span> : null}
      {deletions != null ? <span className="ml-1 text-text-error-primary">-{deletions}</span> : null}
    </span>
  )
}
