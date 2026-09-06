/**
 * 单个工具步骤：标题、域名胶囊、命令/输出、Explored pages。
 */
import { useState } from "react"
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiClipboardLine,
  RiCloseLine,
  RiFileLine,
  RiLoader4Line
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { useT } from "@renderer/i18n"
import type { AgentStepNode } from "../agent-step-tree.types"
import { DomainPills } from "./domain-pills"
import { ExploredPagesBranch } from "./explored-pages-branch"

export function ToolStepNodeRow({ node }: { node: AgentStepNode }) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const hasDetail = Boolean(node.command || node.output || node.errorText)

  function handleCopy(event: React.MouseEvent) {
    event.stopPropagation()
    const text = node.command || node.detail || ""
    if (!text) return
    void navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      <StepTitleRow node={node} hasDetail={hasDetail} expanded={expanded} onToggle={() => hasDetail && setExpanded(!expanded)} />
      {node.domainPills && node.domainPills.length > 0 ? <DomainPills pills={node.domainPills} /> : null}
      {!expanded && node.detail && node.kind !== "editing" ? (
        <p className="max-w-xl truncate pl-0.5 font-mono text-caption-2-regular text-text-tertiary">{node.detail}</p>
      ) : null}
      {expanded && hasDetail ? (
        <StepDetailCard node={node} copied={copied} onCopy={handleCopy} />
      ) : null}
      {node.exploredPages && node.exploredPages.length > 0 ? (
        <ExploredPagesBranch
          title={node.exploredTitle ?? t("chat.exploredPages", { count: node.exploredPages.length })}
          pages={node.exploredPages}
        />
      ) : null}
    </div>
  )
}

function StepTitleRow({
  node,
  hasDetail,
  expanded,
  onToggle
}: {
  node: AgentStepNode
  hasDetail: boolean
  expanded: boolean
  onToggle: () => void
}) {
  const t = useT()
  return (
    <div
      onClick={onToggle}
      className={cx("group flex w-fit items-center gap-2 text-caption-1-medium", hasDetail && "cursor-pointer")}
    >
      {(node.kind === "editing" || node.kind === "reading") && node.fileName ? (
        <FileTitle node={node} />
      ) : (
        <span className="font-semibold text-text-primary group-hover:text-accent-500">{node.title}</span>
      )}
      {node.status === "running" ? <RiLoader4Line className="size-3 animate-spin text-accent-500" /> : null}
      {node.status === "completed" ? (
        <span className="flex size-3.5 items-center justify-center rounded-full bg-state-success-text/15 text-state-success-text">
          <RiCheckLine className="size-2.5" />
        </span>
      ) : null}
      {node.status === "error" ? (
        <span className="inline-flex items-center gap-0.5 text-caption-2-medium text-text-error-primary">
          <RiCloseLine className="size-3.5" />
          <span>{t("chat.failed")}</span>
        </span>
      ) : null}
      <LineDelta additions={node.additions} deletions={node.deletions} />
      {hasDetail ? (
        expanded ? (
          <RiArrowDownSLine className="size-3.5 text-text-tertiary" />
        ) : (
          <RiArrowRightSLine className="size-3.5 text-text-tertiary" />
        )
      ) : null}
    </div>
  )
}

function FileTitle({ node }: { node: AgentStepNode }) {
  const t = useT()
  const editing = node.kind === "editing"
  return (
    <button
      type="button"
      onClick={(event) => {
        if (node.filePath) {
          event.stopPropagation()
          void openChangedFile(node.filePath)
        }
      }}
      title={node.filePath ? t("chat.sessionReviewOpenFile", { name: node.filePath }) : undefined}
      className="flex cursor-pointer items-center gap-1.5 font-mono text-caption-1-regular"
    >
      {node.actionVerb ? (
        <span
          className={cx(
            "shrink-0 rounded border px-1.5 text-caption-2-medium",
            editing
              ? "border-amber-500/25 bg-amber-500/10 text-amber-500"
              : "border-border-button-default/50 bg-background-secondary-default text-text-tertiary"
          )}
        >
          {node.actionVerb}
        </span>
      ) : null}
      <RiFileLine className="size-3.5 shrink-0 text-text-tertiary" />
      {node.fileDir ? <span className="max-w-[180px] truncate text-text-tertiary">{node.fileDir}</span> : null}
      <span className="font-semibold text-text-primary hover:underline">{node.fileName}</span>
    </button>
  )
}

function LineDelta({ additions, deletions }: { additions?: number; deletions?: number }) {
  if (additions == null && deletions == null) return null
  return (
    <span className="font-mono text-caption-2-regular tabular-nums">
      {additions != null ? <span className="text-state-success-text">+{additions}</span> : null}
      {deletions != null ? <span className="text-text-error-primary">-{deletions}</span> : null}
    </span>
  )
}

function StepDetailCard({
  node,
  copied,
  onCopy
}: {
  node: AgentStepNode
  copied: boolean
  onCopy: (event: React.MouseEvent) => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-button-default/70 bg-background-secondary-default/60 p-3 shadow-2xs">
      {node.command ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-caption-2-medium text-text-tertiary">
            <span className="font-semibold text-text-secondary">{t("chat.fullCommand")}</span>
            <button type="button" onClick={onCopy} className="inline-flex cursor-pointer items-center gap-1 hover:text-text-primary">
              {copied ? (
                <>
                  <RiCheckLine className="size-3 text-state-success-text" />
                  <span className="text-state-success-text">{t("common.copied")}</span>
                </>
              ) : (
                <>
                  <RiClipboardLine className="size-3" />
                  <span>{t("chat.copyCommand")}</span>
                </>
              )}
            </button>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-border-button-default/60 bg-background-primary-default p-2.5 font-mono text-caption-1-regular text-text-primary">
            <code>{node.command}</code>
          </pre>
        </div>
      ) : null}
      {node.output || node.errorText ? <TerminalTrace node={node} /> : null}
    </div>
  )
}

function TerminalTrace({ node }: { node: AgentStepNode }) {
  const t = useT()
  const ok = node.exitCode === 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-caption-2-medium">
        <span className="font-semibold text-text-secondary">{t("chat.terminalOutput")}</span>
        {node.exitCode !== undefined ? (
          <span
            className={cx(
              "rounded px-1.5 font-mono text-caption-2-medium",
              ok ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}
          >
            {t("chat.exitCode", { code: node.exitCode })}
          </span>
        ) : null}
      </div>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-border-button-default bg-background-tertiary-default p-2.5 font-mono text-caption-2-regular text-text-primary">
        <code>{node.output || node.errorText}</code>
      </pre>
    </div>
  )
}
