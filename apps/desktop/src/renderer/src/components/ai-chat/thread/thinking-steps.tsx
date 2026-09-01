/**
 * Thinking 时间线：竖线 + Tool Chips 步骤 / 文件变更胶囊。
 */
import { ToolChips, type ToolStepItem } from "@/components/ai-elements/tool-chips"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { fileChangesFromRows } from "./thinking-chips"
import type { TraceRow } from "./thinking-rows"

export function ThinkingSteps({ rows }: { rows: TraceRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-1 text-caption-1-medium text-text-tertiary">No reasoning trace for this turn.</p>
    )
  }

  return (
    <div className="relative mt-1 ml-1.5 pl-4">
      <span className="absolute top-0 bottom-1 left-px w-px bg-separator-border" aria-hidden />
      <ToolChips
        embedded
        defaultExpanded
        steps={rows.map(toToolStep)}
        fileChanges={fileChangesFromRows(rows)}
        onOpenFile={(path) => void openChangedFile(path)}
      />
    </div>
  )
}

function toToolStep(row: TraceRow): ToolStepItem {
  return {
    id: row.id,
    kind: stepKind(row),
    title: row.primary,
    detail: row.secondary,
    additions: row.add,
    deletions: row.del,
    status: row.failed ? "error" : row.working ? "running" : row.done ? "completed" : "pending"
  }
}

function stepKind(row: TraceRow): ToolStepItem["kind"] {
  if (row.kind === "reasoning") return "thinking"
  if (row.kind === "search") return "search"
  if (row.kind !== "coding") return "other"
  const verb = row.primary.toLowerCase()
  if (verb === "read") return "read"
  if (verb === "run" || verb === "git") return "command"
  if (verb === "edit") return "edit"
  return "write"
}
