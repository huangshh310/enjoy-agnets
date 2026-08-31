/**
 * Thinking 时间线：竖线 + 按行类型画思考 / 搜索 / 编码步骤。
 */
import { RiCheckLine, RiCloseCircleLine, RiSearchLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { TraceRow } from "./thinking-rows"

export function ThinkingSteps({ rows }: { rows: TraceRow[] }) {
  return (
    <div className="relative mt-1 ml-1.5 pl-4">
      <span className="absolute top-0 bottom-1 left-px w-px bg-separator-border" aria-hidden />
      {rows.length === 0 ? (
        <p className="py-1 text-caption-1-medium text-text-tertiary">No reasoning trace for this turn.</p>
      ) : (
        <ol className="flex flex-col gap-0.5 py-1">
          {rows.map((row) => (
            <li key={row.id} className="flex min-h-7 items-start gap-2 rounded-md px-1.5 py-0.5">
              <RowMark row={row} />
              <span
                className={cx(
                  "min-w-0 flex-1 text-caption-1-medium",
                  row.kind === "reasoning"
                    ? "whitespace-pre-wrap text-text-secondary"
                    : "truncate text-text-primary"
                )}
              >
                {row.primary}
                {row.secondary ? (
                  <span
                    className={cx(
                      "ml-1.5 text-caption-1-regular text-text-tertiary",
                      row.mono && "font-mono"
                    )}
                  >
                    {row.secondary}
                  </span>
                ) : null}
              </span>
              {row.add != null ? (
                <span className="shrink-0 font-mono text-caption-2-regular tabular-nums">
                  <span className="text-state-success-text">+{row.add}</span>{" "}
                  <span className="text-text-error-primary">-{row.del ?? 0}</span>
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function RowMark({ row }: { row: TraceRow }) {
  if (row.kind === "reasoning") return <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-separator-border" />
  if (row.kind === "search") {
    return <RiSearchLine className="mt-1 size-3.5 shrink-0 text-text-tertiary" />
  }
  if (row.failed) return <RiCloseCircleLine className="mt-0.5 size-3.5 shrink-0 text-text-error-primary" />
  if (row.done) return <RiCheckLine className="mt-0.5 size-3.5 shrink-0 text-text-tertiary" />
  return (
    <span className="mt-1.5 size-3 shrink-0 rounded-full border border-border-button-default border-t-text-secondary animate-pulse" />
  )
}
