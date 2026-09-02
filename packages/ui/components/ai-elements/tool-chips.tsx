/**
 * AI Tool Chips：工具步骤 + 文件增减胶囊。
 * 交互对标 https://www.beautifului.dev/（05 Tool Chips），皮走 BoardUI token。
 */
"use client"

import { useState } from "react"
import {
  RiArrowDownSLine,
  RiCloseLine,
  RiEditLine,
  RiFileLine,
  RiLoader4Line,
  RiSearchLine,
  RiSparklingFill,
  RiTerminalBoxLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import { uiT, useUiLocale } from "@/i18n/ui-locale"
import type { FileChangeChip, ToolChipsProps, ToolStepItem } from "./tool-chips.types"

export type { FileChangeChip, ToolChipsProps, ToolStepItem } from "./tool-chips.types"

function fileName(path: string) {
  const parts = path.split(/[\\/]/)
  return parts.at(-1) || path
}

/** 文件变更胶囊：路径名 + 增减行，点选打开文件。 */
export function FileChangeChips({
  files,
  onOpenFile,
  visibleLimit = 3
}: {
  files: FileChangeChip[]
  onOpenFile?: (path: string) => void
  visibleLimit?: number
}) {
  useUiLocale()
  const [showAll, setShowAll] = useState(false)
  if (files.length === 0) return null

  const visible = showAll || files.length <= visibleLimit ? files : files.slice(0, visibleLimit)
  const hidden = files.length - visible.length

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      {visible.map((file) => (
        <button
          key={file.path}
          type="button"
          onClick={() => onOpenFile?.(file.path)}
          className="inline-flex items-center gap-1.5 rounded-md border border-separator-border bg-background-secondary-default px-2 py-0.5 text-caption-2-regular text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
        >
          <RiFileLine className="size-3 shrink-0 text-foreground-icon-tertiary" />
          <span className="max-w-[10rem] truncate font-mono text-caption-2-medium text-text-primary">
            {fileName(file.path)}
          </span>
          <DiffMarks additions={file.additions} deletions={file.deletions} />
        </button>
      ))}
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="rounded-md px-1.5 py-0.5 text-caption-2-medium text-text-tertiary hover:text-text-primary"
        >
          {uiT(`+${hidden} 项`, `+${hidden} more`)}
        </button>
      ) : null}
    </div>
  )
}

function DiffMarks({ additions, deletions }: { additions?: number; deletions?: number }) {
  if (additions == null && deletions == null) return null
  return (
    <span className="flex items-center gap-1 font-mono text-caption-2-regular tabular-nums">
      {additions != null ? <span className="text-state-success-text">+{additions}</span> : null}
      {deletions != null ? <span className="text-text-error-primary">-{deletions}</span> : null}
    </span>
  )
}

function StepIcon({ kind }: { kind: ToolStepItem["kind"] }) {
  const cls = "size-3.5 shrink-0 text-foreground-icon-tertiary"
  if (kind === "thinking") return <RiSparklingFill className="size-3.5 shrink-0 text-accent-500" />
  if (kind === "write" || kind === "edit") return <RiEditLine className={cls} />
  if (kind === "command") return <RiTerminalBoxLine className={cls} />
  if (kind === "read") return <RiFileLine className={cls} />
  if (kind === "search") return <RiSearchLine className={cls} />
  return <span className="mt-1 size-1.5 shrink-0 rounded-full bg-separator-border" />
}

function StepRow({ step }: { step: ToolStepItem }) {
  const thinking = step.kind === "thinking"
  const running = step.status === "running"
  const errored = step.status === "error"
  return (
    <div className="flex min-h-7 items-start gap-2 px-1.5 py-0.5">
      <span className="mt-0.5">
        <StepIcon kind={step.kind} />
      </span>
      <span
        className={cx(
          "min-w-0 flex-1 text-caption-1-medium",
          thinking ? "whitespace-pre-wrap text-text-secondary" : "truncate text-text-primary"
        )}
      >
        {step.title}
        {step.detail ? (
          <span className="ml-1.5 font-mono text-caption-1-regular text-text-tertiary">{step.detail}</span>
        ) : null}
      </span>
      <DiffMarks additions={step.additions} deletions={step.deletions} />
      {running ? <RiLoader4Line className="mt-0.5 size-3 shrink-0 animate-spin text-accent-500" /> : null}
      {errored ? <RiCloseLine className="mt-0.5 size-3 shrink-0 text-text-error-primary" /> : null}
    </div>
  )
}

export function ToolChips({
  summaryLabel,
  steps = [],
  fileChanges = [],
  defaultExpanded = true,
  embedded = false,
  onOpenFile,
  className,
  visibleLimit = 3
}: ToolChipsProps) {
  useUiLocale()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const open = embedded || expanded
  const toolCount = steps.filter((step) => step.kind !== "thinking").length
  const fileCount = fileChanges.length
  const toolPart = uiT(
    `${toolCount} 次工具调用`,
    `${toolCount} tool ${toolCount === 1 ? "call" : "calls"}`
  )
  const filePart =
    fileCount > 0
      ? uiT(
          `，${fileCount} 个文件变更`,
          `, ${fileCount} file ${fileCount === 1 ? "change" : "changes"}`
        )
      : ""
  const label = summaryLabel || `${toolPart}${filePart}`
  return (
    <div
      className={cx(
        "flex flex-col gap-1.5",
        !embedded &&
          "rounded-xl border border-separator-border bg-background-primary-default p-3 shadow-2xs",
        className
      )}
    >
      {embedded ? null : (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="flex w-fit items-center gap-1.5 text-left text-caption-1-medium text-text-secondary hover:text-text-primary"
        >
          <RiArrowDownSLine
            className={cx(
              "size-3.5 text-foreground-icon-tertiary transition-transform duration-200",
              !expanded && "-rotate-90"
            )}
          />
          <span>{label}</span>
        </button>
      )}

      {open && steps.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          {steps.map((step) => (
            <StepRow key={step.id} step={step} />
          ))}
        </div>
      ) : null}

      {open ? (
        <FileChangeChips files={fileChanges} onOpenFile={onOpenFile} visibleLimit={visibleLimit} />
      ) : null}
    </div>
  )
}
