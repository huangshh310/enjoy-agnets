/**
 * File Diff 展示：unified hunk 行视图，供 Changes、审批卡、工具结果共用。
 */
import { RiAddLine, RiSubtractLine } from "@remixicon/react"
import type { DiffLine, FileDiffModel } from "@enjoy-agents/agent-core/diff"
import { cx } from "@/utils/cx"

export function FileDiff({
  model,
  compact = false
}: {
  model: FileDiffModel
  compact?: boolean
}) {
  if (model.hunks.length === 0) {
    return (
      <p className="px-3 py-4 text-center text-caption-1-medium text-text-tertiary">
        No line changes in this file.
      </p>
    )
  }

  return (
    <div
      className={cx(
        "overflow-hidden rounded-xl border border-border-button-default bg-background-primary-default",
        compact ? "max-h-64" : "min-h-0 flex-1"
      )}
    >
      <header className="flex items-center gap-2 border-b border-separator-border px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-caption-1-regular text-text-primary">
          {model.path}
        </span>
        <span className="inline-flex items-center gap-0.5 text-caption-1-semibold text-state-success-text">
          <RiAddLine className="size-3" />
          {model.additions}
        </span>
        <span className="inline-flex items-center gap-0.5 text-caption-1-semibold text-text-error-primary">
          <RiSubtractLine className="size-3" />
          {model.deletions}
        </span>
      </header>
      <div className={cx("overflow-auto font-mono text-caption-1-regular", compact ? "max-h-52" : "max-h-full")}>
        {model.hunks.map((hunk) => (
          <section key={hunk.header}>
            <div className="sticky top-0 bg-background-secondary-default px-3 py-1 font-mono text-caption-2-regular text-text-tertiary">
              {hunk.header}
            </div>
            {hunk.lines.map((line, index) => (
              <DiffRow key={`${hunk.header}-${index}`} line={line} />
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}

function DiffRow({ line }: { line: DiffLine }) {
  return (
    <div
      className={cx(
        "grid grid-cols-[2.5rem_2.5rem_minmax(0,1fr)] gap-0",
        line.kind === "add" && "bg-state-success-text/8",
        line.kind === "del" && "bg-text-error-primary/8"
      )}
    >
      <span className="select-none pr-2 text-right tabular-nums text-text-tertiary">
        {line.oldNo ?? ""}
      </span>
      <span className="select-none pr-2 text-right tabular-nums text-text-tertiary">
        {line.newNo ?? ""}
      </span>
      <span
        className={cx(
          "whitespace-pre-wrap break-all px-1",
          line.kind === "add" && "text-state-success-text",
          line.kind === "del" && "text-text-error-primary",
          line.kind === "context" && "text-text-secondary"
        )}
      >
        <span className="mr-1 text-text-tertiary">
          {line.kind === "add" ? "+" : line.kind === "del" ? "-" : " "}
        </span>
        {line.text}
      </span>
    </div>
  )
}
